import { Unit } from "./unit_list";
import { UnitEntry } from "./unit_entry";
import ProgressBar from "@ramonak/react-progress-bar";
import { get_cameo } from "../util";

export interface BuildState extends Unit {
  progress: number;
  on_hold: boolean;
  name: string;
}

export type BuildQueueProps = {
  player: string;
  cameos: Map<string, string>;
  units: BuildState[];
};

export const BuildQueue = ({ player, cameos, units }: BuildQueueProps) => {
  return (
    <div className="build-queue">
      <div className="player-info" id={player}>
        <div className="player-name">
          <span className="row" id="player">
            {player}
          </span>
        </div>
      </div>
      {units.map((u) => (
        <UnitEntry name={u.name} cameo={get_cameo(cameos, u.name)}>
          <div id="build-progress">
            <ProgressBar
              labelClassName="progress"
              height="10px"
              labelAlignment="center"
              completed={Math.round((u.progress / 54.0) * 100.0)}
              transitionDuration="0.1s"
            ></ProgressBar>
          </div>
        </UnitEntry>
      ))}
    </div>
  );
};
