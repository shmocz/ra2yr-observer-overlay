import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export enum ConnectionState {
  NONE = "NONE",
  CONNECTING= "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR",
  CLOSED = "CLOSED"
}

export interface SettingsProps {
  poll_rate: number;
  address: string;
  connected: ConnectionState;
  on_change?: any;
}

export const Settings = ({
  poll_rate,
  address,
  connected,
  on_change,
}: SettingsProps) => {
  return (
    <form id="settings">
      <h1>Settings</h1>
      <div>
        <label htmlFor="address">Remote address</label>
        <input name="address" id="address" type="text" defaultValue={`${address}`} />
      </div>
      <div>
        <label htmlFor="connected">Connection status</label>
        <input
          name="connected"
          id="connected"
          readOnly={true}
          type="text"
          value={`${connected}`}
        />
      </div>
      <div className="poll-rate">
        <label htmlFor="poll-rate">Poll rate</label>
        <>
          <Slider
            className="slider"
            range
            defaultValue={poll_rate}
            min={16}
            max={2500}
            onChange={on_change}
          ></Slider>
        </>
        <input
          name="poll-rate"
          id="poll-rate"
          type="text"
          value={`${poll_rate}`}
          readOnly={true}
        />
      </div>
    </form>
  );
};
