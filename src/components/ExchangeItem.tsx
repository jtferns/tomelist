import { faMeteor, faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Image,
  Link,
  Text,
} from "@theme-ui/components";
import { useCallback } from "react";
import { EventExchange } from "../hooks/useGetEventData";

type ExchangeItemProps = {
  exchange: EventExchange;
  tomesCount: number;
  selectionCount: number;
  addSelection: (ee: EventExchange) => void;
  removeSelection: (ee: EventExchange) => void;
};
export const ExchangeItem = ({
  exchange,
  tomesCount = 0,
  selectionCount = 0,
  addSelection,
  removeSelection,
}: ExchangeItemProps) => {
  const isInsufficient =
    selectionCount === 0 ||
    tomesCount === 0 ||
    exchange.tomestonesCost * selectionCount > tomesCount;
  const onAddSelection = useCallback(() => addSelection(exchange), [
    addSelection,
    exchange,
  ]);
  const onRemoveSelection = useCallback(() => removeSelection(exchange), [
    exchange,
    removeSelection,
  ]);
  return (
    <Card m={2}>
      <Flex sx={{ alignItems: "center" }}>
        <Box p={1} mr={2} bg="muted" sx={{ maxHeight: 56 }}>
          <Image sx={{ maxHeight: 40 }} src={exchange.img} />
        </Box>
        <Flex sx={{ flexDirection: "column", flexGrow: 1 }}>
          <Box>
            <Text
              mr={2}
              sx={{
                fontWeight: 700,
                fontSize: 4,
              }}
              variant={isInsufficient ? "insufficient" : "sufficient"}
            >
              {`${selectionCount}x`}
            </Text>
            <Link
              mr={2}
              sx={{
                fontWeight: 700,
                textDecoration: "none",
                fontSize: 3,
              }}
              variant={isInsufficient ? "insufficient" : "sufficient"}
              href={exchange.guideLink}
              className="eorzeadb_link"
              target="_blank"
              rel="noreferrer"
            >
              {exchange.name}
            </Link>
            <Badge variant="outline">{exchange.type}</Badge>
          </Box>
          <Box>
            <Button
              mr={2}
              sx={{ cursor: "pointer" }}
              variant="add"
              onClick={onAddSelection}
            >
              <FontAwesomeIcon icon={faPlus} />
            </Button>
            <Button
              sx={{ cursor: "pointer" }}
              variant="remove"
              onClick={onRemoveSelection}
            >
              <FontAwesomeIcon icon={faMinus} />
            </Button>
          </Box>
        </Flex>
        <Text
          sx={{ fontSize: 5 }}
          variant={isInsufficient ? "insufficient" : "sufficient"}
        >
          {exchange.tomestonesCost}
          &nbsp;
          <FontAwesomeIcon icon={faMeteor} inverse size="xs" />
        </Text>
      </Flex>
    </Card>
  );
};
