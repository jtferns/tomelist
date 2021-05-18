import { faMeteor, faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Button,
  Card,
  Flex,
  Image,
  Link,
  Text,
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
        <Flex sx={{ flexDirection: "column", flexGrow: 1 }}>
          <Box>
            <Text
              mr={2}
              sx={{
                fontWeight: 700,
                fontSize: 4,
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
                fontSize: 3,
              }}
              href={objective.guideLink}
              className="eorzeadb_link"
              target="_blank"
              rel="noreferrer"
            >
              {objective.name}
            </Link>
          </Box>
          <Box>
            <Button
              mr={2}
              sx={{ cursor: "pointer" }}
              variant="add"
              onClick={onAddRun}
            >
              <FontAwesomeIcon icon={faPlus} />
            </Button>
            <Button
              sx={{ cursor: "pointer" }}
              variant="remove"
              onClick={onRemoveRun}
            >
              <FontAwesomeIcon icon={faMinus} />
            </Button>
          </Box>
        </Flex>
        <Text sx={{ fontSize: 5 }}>
          <FontAwesomeIcon icon={faMeteor} inverse size="xs" />
          &nbsp;
          {objective.tomestonesCount}
        </Text>
      </Flex>
    </Card>
  );
};
