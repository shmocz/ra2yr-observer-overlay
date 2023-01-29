import { useState, useEffect } from "react";
import * as cameos from "./cameos.json";
import "./App.css";
import { UnitList, Unit } from "./components/unit_list";
import { ra2yrproto } from "./protocol/compiled";
import { API, decode_command } from "./api";
import { Settings, ConnectionState } from "./components/settings";
import { BuildQueue } from "./components/build_queue";

let g_api_handle: API | null = null;
let g_poll_interval: any = null;
let g_ttc_map: any = null;

function get_house_unit_counts(
  ot: ra2yrproto.ra2yr.ObjectTypeClass[],
  objs: ra2yrproto.ra2yr.Object[],
  h: ra2yrproto.ra2yr.House,
  g_ttc_map: any
): Unit[] {
  let counts = new Map();
  objs
    .filter((o) => o.pointer_house === h.self)
    .forEach((f) => {
      const k = f.pointer_technotypeclass;
      if (k) {
        if (!counts.has(k)) {
          counts.set(k, 0);
        }
        counts.set(k, counts.get(k) + 1);
      }
    });
  let res = Array.from(counts).map(([key, val]) => {
    return { name: g_ttc_map[key], count: val, image: "" };
  });
  res.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
  return res;
}

function get_unit_counts(
  ot: ra2yrproto.ra2yr.ObjectTypeClass[],
  ho: ra2yrproto.ra2yr.House[],
  objs: ra2yrproto.ra2yr.Object[]
) {
  return ho.map((h) => ({
    player: h.name,
    money: h.money,
    power: h.power_output,
    drain: h.power_drain,
    units: get_house_unit_counts(ot, objs, h, g_ttc_map),
  }));
}

function get_build_queue(
  ot: ra2yrproto.ra2yr.ObjectTypeClass[],
  ho: ra2yrproto.ra2yr.House[],
  objs: ra2yrproto.ra2yr.Object[],
  fa: ra2yrproto.ra2yr.Factory[],
  ttc_map: any
) {
  let res = [];
  let omap = Object.fromEntries(
    objs.map((o) => {
      return [o.pointer_self, o.pointer_technotypeclass];
    })
  );

  for (let h of ho) {
    res.push({
      player: h.name,
      units: fa
        .filter((f) => f.owner === h.self)
        .map((f) => ({
          name: ttc_map[omap[f.object]],
          on_hold: false,
          progress: f.progress_timer,
          count: 0,
        })),
    });
  }
  return res;
}

enum FetchState {
  NONE,
  PENDING,
  DONE,
}

function App() {
  const [connectState, setConnectState] = useState(ConnectionState.NONE);
  const [settings, setSettings] = useState({
    connected: ConnectionState.NONE,
    address: "ws://localhost:14525",
    poll_rate: 1000,
    types_fetched: FetchState.NONE,
  });

  const [objectTypes, setObjectTypes]: [
    ra2yrproto.ra2yr.ObjectTypeClass[],
    any
  ] = useState([]);
  const [houses, setHouses]: [ra2yrproto.ra2yr.House[], any] = useState([]);
  const [objects, setObjects]: [ra2yrproto.ra2yr.Object[], any] = useState([]);
  const [factories, setFactories]: [ra2yrproto.ra2yr.Factory[], any] = useState(
    []
  );
  const [settingsVisible, setSettingsVisible]: [boolean, any] = useState(false);

  if (objectTypes) {
    g_ttc_map = Object.fromEntries(
      objectTypes.map((x) => [x.pointer_self, x.name])
    );
  }

  const build_queue = get_build_queue(
    objectTypes,
    houses,
    objects,
    factories,
    g_ttc_map
  ).filter((x) => x.units.length > 0);
  const ptrs = factories.map((x) => x.object);
  // filter out build queue items from objects, and objects whose original owner isn't anyone in the game (e.g. garrisoned buildings)
  const unit_counts = get_unit_counts(
    objectTypes,
    houses.filter((x) => !["Neutral", "Special"].includes(x.name)),
    objects.filter((x) => !ptrs.includes(x.pointer_self))
  );

  // convert cameo keys to lowercase
  const cCameos = new Map(
    Object.entries(cameos).map(([k, v]) => [k.toLowerCase(), v])
  );

  useEffect(() => {
    if (connectState === ConnectionState.NONE) {
      setConnectState(ConnectionState.CONNECTING);
      g_api_handle = new API(
        settings.address,
        (ev: any) => {
          setConnectState(ConnectionState.CONNECTED);
        },
        (k: string, v: any) => {
          if (k === "objectTypes") {
            setObjectTypes(v);
          } else if (k === "houses") {
            setHouses(v);
          } else if (k === "objects") {
            setObjects(v);
          } else if (k === "factories") {
            setFactories(v);
          }
        },
        (ev: any) => {
          setConnectState(
            ev.type === "close" ? ConnectionState.CLOSED : ConnectionState.ERROR
          );

          if (g_poll_interval !== null) {
            clearInterval(g_poll_interval);
          }
        }
      );
    }
  }, [connectState, settings.address]);

  useEffect(() => {
    if (connectState === ConnectionState.CONNECTED) {
      if (settings.types_fetched === FetchState.NONE) {
        setSettings({
          ...settings,
          connected: connectState,
          types_fetched: FetchState.PENDING,
        });
        g_api_handle?.send_command(
          ra2yrproto.commands.ReadValue.create({
            args: {
              data: {
                initial_game_state: ra2yrproto.ra2yr.GameState.create({}),
              },
            },
          }),
          (res: ra2yrproto.ICommandResult) => {
            setObjectTypes(
              decode_command(res, ra2yrproto.commands.ReadValue).data
                .initial_game_state.object_types
            );
            setSettings({
              ...settings,
              connected: connectState,
              types_fetched: FetchState.DONE,
            });
          }
        );
      }
      if (settings.types_fetched === FetchState.DONE) {
        // Clear previous interval if any
        if (g_poll_interval !== null) {
          clearInterval(g_poll_interval);
        }
        g_poll_interval = setInterval(() => {
          if (g_api_handle !== null) {
            g_api_handle.send_command(
              ra2yrproto.commands.GetGameState.create(),
              (res: ra2yrproto.ICommandResult) => {
                g_api_handle?.update_state(
                  ra2yrproto.ra2yr.GameState.create(
                    decode_command(res, ra2yrproto.commands.GetGameState).state
                  )
                );
              }
            );
          }
        }, settings.poll_rate);
      }
    }
  }, [connectState, settings]);

  return (
    <div className="App">
      <div className="box">
        <button onClick={(e: any) => setSettingsVisible(!settingsVisible)}>
          S
        </button>
        {settingsVisible ? (
          <Settings
            {...settings}
            on_change={(e: any) => setSettings({ ...settings, poll_rate: e })}
          ></Settings>
        ) : null}
      </div>
      <div className="box" style={{ overflow: "auto" }}>
        {unit_counts.map((u) => (
          <UnitList
            player={u.player}
            power={u.power}
            drain={u.drain}
            money={u.money}
            units={u.units}
            cameos={cCameos}
          ></UnitList>
        ))}
      </div>
      <div className="box">
        {build_queue.map((x) => (
          <BuildQueue {...x} cameos={cCameos}></BuildQueue>
        ))}
      </div>
    </div>
  );
}

export default App;
