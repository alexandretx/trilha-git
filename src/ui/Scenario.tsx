interface ScenarioProps {
  text: string;
}

export function Scenario({ text }: ScenarioProps) {
  return <p className="scenario">{text}</p>;
}
