import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Walkthrough"
        component={MyComposition}
        durationInFrames={60 * 30}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
