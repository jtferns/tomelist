import { faSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Divider,
  Flex,
  Input,
  Progress,
  Text,
} from "@theme-ui/components";
import { PropsWithChildren } from "react";
import { Countdown } from "../components/Countdown";
import { TomeIcon } from "../components/TomeIcon";
import { EventData } from "../hooks/useGetEventData";

type HeaderProps = PropsWithChildren<
  Pick<EventData, "startDate" | "endDate"> & {
    currentTomestones: number;
    totalRequiredTomes: number;
    onTomesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }
>;

export const Header = ({
  startDate,
  endDate,
  children,
  currentTomestones,
  totalRequiredTomes,
  onTomesChange,
}: HeaderProps) => {
  const progress = ((currentTomestones / totalRequiredTomes) * 100).toFixed(1);
  return (
    <>
      <Flex sx={{ alignItems: "center" }}>
        {endDate && <Countdown startDate={startDate} endDate={endDate} />}
        <Box p={2} sx={{ flex: "1 1 auto" }}>
          <Progress
            max={totalRequiredTomes}
            value={currentTomestones}
            sx={{
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.25) inset",
            }}
            title={`${progress}%`}
          >
            {`${progress}%`}
          </Progress>
        </Box>
        <Box p={2} sx={{ width: "6rem" }}>
          <Input
            type="number"
            value={currentTomestones}
            onChange={onTomesChange}
          />
        </Box>
        <Flex py={2} pr={2} sx={{ alignItems: "center" }}>
          <FontAwesomeIcon icon={faSlash} rotation={90} />
          &nbsp;
          <Text sx={{ fontSize: 4, display: "inline-flex" }}>
            <TomeIcon />x{totalRequiredTomes}
          </Text>
        </Flex>
      </Flex>
      <Divider />
      <Box p={2} sx={{ height: "calc(100vh - 182px)", overflow: "auto" }}>
        {children}
      </Box>
    </>
  );
};
