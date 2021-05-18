import { Box, Flex } from "@theme-ui/components";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

type CountdownProps = {
  endDate: Date;
};

const minuteSeconds = 60;
const hourSeconds = 3600;
const daySeconds = 86400;

const timerProps = {
  isPlaying: true,
  size: 60,
  strokeWidth: 4,
  trailColor: "#4d4d4d",
};

const renderTime = (dimension: string, time: number) => {
  return (
    <Box
      className="time-wrapper"
      sx={{
        lineHeight: 1.2,
      }}
    >
      <Box className="time">{time}</Box>
      <Box>{dimension}</Box>
    </Box>
  );
};

const getTimeSeconds = (time: number) => (minuteSeconds - time) | 0;
const getTimeMinutes = (time: number) =>
  ((time % hourSeconds) / minuteSeconds) | 0;
const getTimeHours = (time: number) => ((time % daySeconds) / hourSeconds) | 0;
const getTimeDays = (time: number) => (time / daySeconds) | 0;

export const Countdown = ({ endDate }: CountdownProps) => {
  const startTime = Date.now() / 1000; // use UNIX timestamp in seconds
  const endTime = endDate.getTime() / 1000; // use UNIX timestamp in seconds

  const remainingTime = endTime - startTime;
  const days = Math.ceil(remainingTime / daySeconds);
  const daysDuration = days * daySeconds;
  return (
    <Flex
      sx={{
        justifyContent: "space-around",
        fontFamily: "monospace",
        textAlign: "center",
      }}
      title={`This event ends on ${endDate.toString()}!`}
    >
      <CountdownCircleTimer
        {...timerProps}
        key={`d-${endDate.getTime}`}
        colors="#b3e2cd"
        duration={daysDuration}
        initialRemainingTime={remainingTime}
      >
        {({ elapsedTime = 0 }) =>
          renderTime("d", getTimeDays(daysDuration - elapsedTime))
        }
      </CountdownCircleTimer>
      <CountdownCircleTimer
        {...timerProps}
        key={`h-${endDate.getTime}`}
        colors="#fdcdac"
        duration={daySeconds}
        initialRemainingTime={remainingTime % daySeconds}
        onComplete={(totalElapsedTime) => [
          remainingTime - totalElapsedTime > hourSeconds,
          0,
        ]}
      >
        {({ elapsedTime = 0 }) =>
          renderTime("h", getTimeHours(daySeconds - elapsedTime))
        }
      </CountdownCircleTimer>
      <CountdownCircleTimer
        {...timerProps}
        key={`m-${endDate.getTime}`}
        colors="#cbd5e8"
        duration={hourSeconds}
        initialRemainingTime={remainingTime % hourSeconds}
        onComplete={(totalElapsedTime) => [
          remainingTime - totalElapsedTime > minuteSeconds,
          0,
        ]}
      >
        {({ elapsedTime = 0 }) =>
          renderTime("m", getTimeMinutes(hourSeconds - elapsedTime))
        }
      </CountdownCircleTimer>
      <CountdownCircleTimer
        {...timerProps}
        key={`s-${endDate.getTime}`}
        colors="#f4cae4"
        duration={minuteSeconds}
        initialRemainingTime={remainingTime % minuteSeconds}
        onComplete={(totalElapsedTime) => [
          remainingTime - totalElapsedTime > 0,
          0,
        ]}
      >
        {({ elapsedTime = 0 }) => renderTime("s", getTimeSeconds(elapsedTime))}
      </CountdownCircleTimer>
    </Flex>
  );
};
