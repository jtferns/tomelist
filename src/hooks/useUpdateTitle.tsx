import { useEffect } from "react";
import pJson from "../../package.json";

export const useUpdateTitle = () =>
  useEffect(() => {
    document.title = `Tomelist v${pJson.version}`;
  }, []);
