import { google } from "./protocol/compiled";
import { ra2yrproto } from "./protocol/compiled";

function decode_response(data: Uint8Array) {
  let resp = ra2yrproto.Response.decode(data);
  let body = new Uint8Array();
  let type_url = "";
  if (resp.body != null) {
    if (resp.body.value != null) {
      body = new Uint8Array(resp.body.value);
    }
    if (resp.body.type_url != null) {
      type_url = resp.body.type_url;
    }
  }

  return { type_url: type_url, body: body, code: resp.code };
}

export const decode_command = (r: ra2yrproto.ICommandResult, cls: any): any => {
  let a = r.result;

  if (!(a && a.value)) {
    throw Error("bad command");
  }
  return cls.decode(a.value).result;
};

function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]) {
  obj[key] = value;
}

interface CommandCallback {
  id: number;
  callback: any;
}

/** API helper, which repeatedly fetches the GameState by issuing GetGameState and PollResults consecutively. */
export class API {
  uri: string;
  ws: any;
  /** Callback when WebSocket connection has been opened. */
  on_open: any;
  /** Callback on connection close or error. */
  on_close: any;
  /** Unique command queue id for this connection. */
  queue_id: number;
  /** Look-up TechnoTypeClass instances by their id (this pointer). */
  ttc_map: Map<number, ra2yrproto.ra2yr.ObjectTypeClass>;
  state: ra2yrproto.ra2yr.GameState;
  /** Callback after new state has been fetched and set. */
  on_state_update: any;
  pending_commands: CommandCallback[];
  command_result: any;
  max_pending_commands: number;

  constructor(
    uri: string,
    on_open: any,
    on_state_update?: any,
    on_close?: any,
    max_pending_commands: number = 30
  ) {
    this.uri = uri;
    this.ws = new WebSocket(this.uri);
    this.ws.binaryType = "arraybuffer";
    this.on_open = on_open;
    this.on_close = on_close;
    this.ws.addEventListener("message", this.on_message.bind(this));
    this.ws.addEventListener("open", this.on_open);
    this.ws.addEventListener("error", this.on_close);
    this.ws.addEventListener("close", this.on_close);
    this.queue_id = -1;
    this.ttc_map = new Map();
    this.state = new ra2yrproto.ra2yr.GameState();
    this.on_state_update = on_state_update;
    this.pending_commands = [];
    this.command_result = new Map();
    this.max_pending_commands = max_pending_commands;
  }

  set_state_property(state: ra2yrproto.ra2yr.GameState, key: string) {
    const k = key as keyof typeof state;
    setProperty(this.state, k, state[k]);
    if (this.on_state_update) {
      this.on_state_update(k, this.state[k]);
    }
  }

  update_object_types(state: ra2yrproto.ra2yr.GameState) {
    if (this.state.object_types.length < state.object_types.length) {
      this.set_state_property(state, "object_types");
    }
  }

  update_state(state: ra2yrproto.ra2yr.GameState) {
    this.update_object_types(state);
    ["factories", "houses", "objects"].forEach((s) => {
      const k = s as keyof typeof state;
      if (state[k]) {
        this.set_state_property(state, k);
      }
    });
  }

  /** Wrap a command inside ra2yrproto.Command object, and send the encoded message with the current WebSocket connection.
   */
  send_command(
    c: any,
    callback: any | null = null,
    ctype: ra2yrproto.CommandType = ra2yrproto.CommandType.CLIENT_COMMAND
  ) {
    // FIXME: avoid flooding the queue if this fails
    if (callback !== null) {
      if (this.pending_commands.length >= this.max_pending_commands) {
        throw new Error(
          `exceed pending commands: ${this.max_pending_commands}`
        );
      }
      this.pending_commands.push({ id: -1, callback: callback });
    }

    this.ws.send(
      ra2yrproto.Command.encode(
        ra2yrproto.Command.fromObject({
          command_type: ctype,
          command: new google.protobuf.Any({
            type_url: c.constructor.getTypeUrl(),
            value: c.constructor.encode(c).finish(),
          }),
        })
      ).finish()
    );
  }

  on_command_result(r: ra2yrproto.ICommandResult) {
    let a = r.result;
    const i = this.pending_commands.findIndex((x) => x.id === r.command_id);
    if (i !== -1) {
      const cb = this.pending_commands[i].callback;
      this.pending_commands.splice(i, 1);
      cb(r);
    }
    if (
      a?.type_url === "type.googleapis.com/ra2yrproto.commands.GetGameState" &&
      a.value
    ) {
      let result = ra2yrproto.commands.GetGameState.decode(a.value).result;
      if (result?.state) {
        this.update_state(ra2yrproto.ra2yr.GameState.create(result?.state));
      }
    } else if (
      a?.type_url === "type.googleapis.com/ra2yrproto.commands.ReadValue" &&
      a.value
    ) {
      let result = ra2yrproto.commands.ReadValue.decode(a.value).result;
      if (result?.data?.initial_game_state) {
        this.update_state(
          ra2yrproto.ra2yr.GameState.create({
            object_types: result?.data?.initial_game_state.object_types,
          })
        );
      }
    }
  }

  on_poll_results(r: ra2yrproto.PollResults) {
    r.result?.results?.forEach((x) => this.on_command_result(x));
  }

  on_message(event: any) {
    let { type_url, body, code } = decode_response(new Uint8Array(event.data));
    if (code === ra2yrproto.ResponseCode.ERROR) {
      throw new Error(ra2yrproto.TextResponse.decode(body).message);
    }

    // Put command
    if (type_url.indexOf("RunCommandAck") !== -1) {
      const cmd = ra2yrproto.RunCommandAck.decode(body);
      if (this.queue_id === -1) {
        this.queue_id = +cmd.queue_id;
      }

      this.pending_commands
        .filter((x) => x.id === -1)
        .forEach((y) => (y.id = +cmd.id));

      // send poll command
      let p = ra2yrproto.PollResults.fromObject({
        args: { queue_id: this.queue_id, timeout: 5000 },
      });
      this.send_command(p, null, ra2yrproto.CommandType.POLL_BLOCKING);
    }
    // process command response
    else if (type_url.indexOf("PollResults") !== -1) {
      this.on_poll_results(ra2yrproto.PollResults.decode(body));
    }
  }

  get_game_state() {
    this.send_command(ra2yrproto.commands.GetGameState.create());
  }


}
