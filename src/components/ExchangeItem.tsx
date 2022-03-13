import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
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
import { TomeIcon } from "./TomeIcon";

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
  const onAddSelection = useCallback(
    () => addSelection(exchange),
    [addSelection, exchange]
  );
  const onRemoveSelection = useCallback(
    () => removeSelection(exchange),
    [exchange, removeSelection]
  );
  return (
    <Card
      m={2}
      p={2}
      sx={{
        borderRadius: 8,
        transition: "box-shadow .2s ease-in",
        ":hover": {
          boxShadow: "0 0 12px #0fc",
        },
      }}
    >
      <Flex sx={{ alignItems: "center" }}>
        <Box p={1} mr={2} bg="muted" sx={{ maxHeight: 48, borderRadius: 4 }}>
          <Image sx={{ maxHeight: 40 }} src={exchange.img} />
        </Box>
        <Flex sx={{ flexDirection: "column", flexGrow: 1 }}>
          <Box sx={{ maxHeight: 34, display: "flex", alignItems: "center" }}>
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
          <Flex>
            <Button
              py={0}
              px={3}
              mr={2}
              sx={{ cursor: "pointer", fontSize: 12 }}
              variant="add"
              onClick={onAddSelection}
            >
              <FontAwesomeIcon icon={faPlus} />
            </Button>
            <Button
              py={0}
              px={2}
              sx={{ cursor: "pointer", fontSize: 12 }}
              variant="remove"
              onClick={onRemoveSelection}
            >
              <FontAwesomeIcon icon={faMinus} />
            </Button>
          </Flex>
        </Flex>
        <Text
          sx={{ fontSize: 5, display: "flex", alignItems: "center" }}
          variant={isInsufficient ? "insufficient" : "sufficient"}
        >
          <TomeIcon />x{exchange.tomestonesCost}
        </Text>
      </Flex>
    </Card>
  );
};
