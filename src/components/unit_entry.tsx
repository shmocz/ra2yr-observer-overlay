export interface UnitEntryProps {
  name: string;
  cameo?: string;
  children?: React.ReactNode;
  wrapperClassName?: string;
  width?: string;
}

export const UnitEntry = ({
  name,
  cameo,
  children,
  wrapperClassName = "wrapper-2",
}: UnitEntryProps) => {
  return (
    <div className={`unit-entry ${wrapperClassName}`}>
      <div className="unit-cameo">
        <img className="cameo" src={cameo} alt={name}></img>
      </div>
      {children}
    </div>
  );
};
