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
  startDate: Date;
  endDate: Date;
  link: string;
};
const DEFAULT_EVENT_DATA = {
  objectives: [],
  exchange: [],
  startDate: new Date("2020-03-14T08:00:00.000Z"),
  endDate: new Date("2020-03-14T09:00:00.000Z"),
  link: "",
};

export const useGetEventData = () => {
  const [data, setData] = useState<EventData>(DEFAULT_EVENT_DATA);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      await fetch(
        "https://gist.githubusercontent.com/jtferns/1ac2cc922b6fb31a801c5245dd3a0158/raw/cbeed9f9763b3dde23fa9c9585c57b9e58241cc0/itop_ffxiv_ff2021.json"
      )
        .then((fetchedData) => fetchedData.json())
        .then(
          (jsonData) =>
            mounted &&
            setData({
              ...jsonData["2022_verity"],
              startDate: new Date(jsonData["2022_verity"].startDate),
              endDate: new Date(jsonData["2022_verity"].endDate),
            })
        );
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  console.log({ data });

  return data;
};
