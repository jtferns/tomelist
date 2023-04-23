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
  label: string;
};
const DEFAULT_EVENT_DATA = {
  objectives: [],
  exchange: [],
  startDate: new Date("2020-03-14T08:00:00.000Z"),
  endDate: new Date("2020-03-14T09:00:00.000Z"),
  link: "",
  label: "",
};
const DATA_KEY = "2023_mendacity";

export const useGetEventData = () => {
  const [data, setData] = useState<EventData>(DEFAULT_EVENT_DATA);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      await fetch(
        "https://gist.githubusercontent.com/jtferns/1ac2cc922b6fb31a801c5245dd3a0158/raw/65bedec8947ccb0ca4ba49fed77b8bb671df1f81/itop_ffxiv_ff2021.json"
      )
        .then((fetchedData) => fetchedData.json())
        .then(
          (jsonData) =>
            mounted &&
            setData({
              ...jsonData[DATA_KEY],
              startDate: new Date(jsonData[DATA_KEY].startDate),
              endDate: new Date(jsonData[DATA_KEY].endDate),
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
