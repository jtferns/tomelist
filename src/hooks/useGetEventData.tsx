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
  startDate?: Date;
  endDate?: Date;
};
const DEFAULT_EVENT_DATA = {
  objectives: [],
  exchange: [],
};

export const useGetEventData = () => {
  const [data, setData] = useState<EventData>(DEFAULT_EVENT_DATA);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      await fetch(
        "https://gist.githubusercontent.com/jtferns/1ac2cc922b6fb31a801c5245dd3a0158/raw/0e5237789e54ae622b34529f639ebe376f1078ca/itop_ffxiv_ff2021.json"
      )
        .then((fetchedData) => fetchedData.json())
        .then(
          (jsonData) =>
            mounted &&
            setData({
              ...jsonData["2021_lore"],
              startDate: new Date("2021-10-19T08:00:00.000Z"),
              endDate: new Date("2021-11-19T14:59:00.000Z"),
            })
        );
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  return data;
};
