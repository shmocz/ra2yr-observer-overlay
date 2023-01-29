import { UnitEntry } from "./unit_entry";
import { get_cameo } from "../util";
import { useRef } from "react";

export interface Unit {
  name: string;
  count: number;
}

export type UnitListProps = {
  player: string;
  money: number;
  power: number;
  drain: number;
  units: Unit[];
  cameos: Map<string, string>;
  entry_class_name?: string;
  entry_width?: number;
};

export const UnitList = ({
  player,
  money,
  power,
  drain,
  units,
  cameos,
  entry_class_name = "wrapper-1",
  entry_width = 60,
}: UnitListProps) => {
  const elRef = useRef<HTMLHeadingElement>(null);
  const mRef = useRef<HTMLHeadingElement>(null);
  const pRef = useRef<HTMLHeadingElement>(null);

  const widthTotal = elRef.current?.offsetWidth;
  const widthUnits = mRef.current?.offsetWidth;
  const widthPlayer = pRef.current?.offsetWidth;
  let scale = 1;
  if (widthTotal && widthPlayer) {
    const width = widthTotal - widthPlayer;
    scale = Math.ceil((entry_width * units.length) / width);
  }

  return (
    <div ref={elRef} className="unit-list">
      <div ref={pRef} className="player-info" id={player}>
        <div className="player-name">
          <span className="row" id="player">
            {player}
          </span>
        </div>
        <span className="row" id="money">
          💲️ {money}
        </span>
        <span className="row" id="power">
          ⚡️ {power - drain}
        </span>
      </div>
      <div ref={mRef} className="unit-entries">
        {units.map((u) => (
          <UnitEntry
            name={u.name}
            cameo={get_cameo(cameos, u.name)}
            wrapperClassName={`wrapper-${scale}`}
          >
            <div className="unit-count">
              <span className="row" id="unit-count">
                {u.count}
              </span>
            </div>
          </UnitEntry>
        ))}
      </div>
    </div>
  );
};
