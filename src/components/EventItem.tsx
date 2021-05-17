import { Box, Flex, Image } from "@theme-ui/components";
import { EventObjective, InstanceObjective } from "../hooks/useGetEventData";
import { InstanceItem } from "./InstanceItem";

type EventItemProps = {
  objective: EventObjective;
  tomesCost: number;
  addRun: (inst: InstanceObjective) => void;
  removeRun: (inst: InstanceObjective) => void;
};
export const EventItem = ({
  objective,
  tomesCost,
  addRun,
  removeRun,
}: EventItemProps) => {
  return (
    <>
      <Flex sx={{ maxHeight: 36 }}>
        <Box p={1} bg="muted">
          <Image sx={{ maxHeight: 28 }} src={objective.img} />
        </Box>
        <Box
          p={1}
          sx={{ alignSelf: "center", flex: "1 1 auto", lineHeight: 1 }}
        >
          {objective.type}
        </Box>
      </Flex>
      {objective.objs.map((io, i) => (
        <InstanceItem
          key={`${i}-${io.name}`}
          objective={io}
          tomesCost={tomesCost}
          addRun={addRun}
          removeRun={removeRun}
        />
      ))}
    </>
  );
};
