import { useEffect, useState } from "react";

export type InstanceObjective = {
  name: string;
  tomestonesCount: number;
  guideLink: string;
  img: string;
};
export type EventObjective = {
  type: string;
  img: string;
  objs: InstanceObjective[];
};
export type EventExchange = {
  name: string;
  tomestonesCost: number;
  img: string;
  guideLink: string;
  type: string;
};
export type EventData = {
  objectives: EventObjective[];
  exchange: EventExchange[];
};
const DEFAULT_EVENT_DATA = { objectives: [], exchange: [] };

export const useGetEventData = () => {
  const [data, setData] = useState<EventData>(DEFAULT_EVENT_DATA);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      await fetch(
        "https://gist.githubusercontent.com/jtferns/1ac2cc922b6fb31a801c5245dd3a0158/raw/44d0655dfabf659ff3c017cd3ea0c66f0aadcd55/itop_ffxiv_ff2021.json"
      )
        .then((fetchedData) => fetchedData.json())
        .then((jsonData) => mounted && setData(jsonData["2021_pageantry"]));
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  return data;
};
