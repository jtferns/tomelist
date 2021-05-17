import {
  Box,
  Flex,
  Button,
  Card,
  Image,
  Text,
  Link,
} from "@theme-ui/components";
import { useCallback } from "react";
import { InstanceObjective } from "../hooks/useGetEventData";

type InstanceItemProps = {
  objective: InstanceObjective;
  tomesCost: number;
  addRun: (inst: InstanceObjective) => void;
  removeRun: (inst: InstanceObjective) => void;
};
export const InstanceItem = ({
  objective,
  tomesCost,
  addRun,
  removeRun,
}: InstanceItemProps) => {
  const onAddRun = useCallback(() => addRun(objective), [addRun, objective]);
  const onRemoveRun = useCallback(() => removeRun(objective), [
    objective,
    removeRun,
  ]);
  return (
    <Card m={2}>
      <Flex>
        <Image
          sx={{
            objectFit: "cover",
            objectPosition: "center",
            maxHeight: 120,
          }}
          src={objective.img}
        />
        <Flex sx={{ flexDirection: "column" }}>
          <Box>
            <Text
              mr={2}
              sx={{
                fontWeight: 700,
              }}
            >
              {`${Math.max(
                Math.ceil(tomesCost / objective.tomestonesCount),
                0
              )}x`}
            </Text>
            <Link
              mr={2}
              sx={{
                fontWeight: 700,
                textDecoration: "none",
              }}
              href={objective.guideLink}
              className="eorzeadb_link"
              target="_blank"
              rel="noreferrer"
            >
              {objective.name}
            </Link>
            <Text>{objective.tomestonesCount}</Text>
          </Box>
          <Box>
            <Button
              mr={2}
              sx={{ cursor: "pointer" }}
              variant="add"
              onClick={onAddRun}
            >
              +Run
            </Button>
            <Button
              sx={{ cursor: "pointer" }}
              variant="remove"
              onClick={onRemoveRun}
            >
              -Run
            </Button>
          </Box>
        </Flex>
      </Flex>
    </Card>
  );
};
