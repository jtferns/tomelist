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
        "https://gist.githubusercontent.com/jtferns/1ac2cc922b6fb31a801c5245dd3a0158/raw/d800a6fba10b99d3ef697c2f6d027d45b7fef88f/itop_ffxiv_ff2021.json"
      )
        .then((fetchedData) => fetchedData.json())
        .then(
          (jsonData) =>
            mounted &&
            setData({
              ...jsonData["2022_scripture"],
              startDate: new Date("2022-03-14T08:00:00.000Z"),
              endDate: new Date("2022-04-15T14:59:00.000Z"),
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
