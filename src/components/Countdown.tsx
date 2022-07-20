import { Box, Flex } from "@theme-ui/components";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

type CountdownProps = {
  startDate: Date;
  endDate: Date;
};

const MINUTE_SECONDS = 60;
const HOUR_SECONDS = MINUTE_SECONDS * 60;
const DAY_SECONDS = HOUR_SECONDS * 24;
const LOOP_DELAY_MS = 100;

const timerProps = {
  isPlaying: true,
  size: 60,
  strokeWidth: 4,
  trailColor: "#4d4d4d",
};

const renderTime = (dimension: "d" | "h" | "m" | "s", time: number) => {
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

const getTimeSeconds = (time: number) => (MINUTE_SECONDS - time) | 0;
const getTimeMinutes = (time: number) =>
  ((time % HOUR_SECONDS) / MINUTE_SECONDS) | 0;
const getTimeHours = (time: number) =>
  ((time % DAY_SECONDS) / HOUR_SECONDS) | 0;
const getTimeDays = (time: number) => (time / DAY_SECONDS) | 0;

export const Countdown = ({ startDate, endDate }: CountdownProps) => {
  const startTime = startDate.getTime() / 1000; // use UNIX timestamp in seconds
  const currentStartTime = Date.now() / 1000; // use UNIX timestamp in seconds
  const endTime = endDate.getTime() / 1000; // use UNIX timestamp in seconds
  const hasStarted = currentStartTime - startTime > 0;
  const currentEndTime = hasStarted ? endTime : startTime;

  const remainingTime = currentEndTime - currentStartTime;
  const days = Math.ceil(remainingTime / DAY_SECONDS);
  const daysDuration = days * DAY_SECONDS;
  const title = hasStarted
    ? `This event ends on ${endDate.toString()}!`
    : `This event starts on ${startDate.toString()}!`;

  console.log({
    endDate,
    currentStartTime,
    currentEndTime,
    remainingTime,
    days,
    daysDuration,
  });

  return (
    <Flex
      sx={{
        justifyContent: "space-around",
        fontFamily: "monospace",
        textAlign: "center",
      }}
      title={title}
    >
      <CountdownCircleTimer
        {...timerProps}
        key={`d-${currentEndTime}`}
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
        key={`h-${currentEndTime}`}
        colors="#fdcdac"
        duration={DAY_SECONDS}
        initialRemainingTime={remainingTime % DAY_SECONDS}
        onComplete={(totalElapsedTime) => [
          remainingTime - totalElapsedTime > HOUR_SECONDS,
          LOOP_DELAY_MS,
        ]}
      >
        {({ elapsedTime = 0 }) =>
          renderTime("h", getTimeHours(DAY_SECONDS - elapsedTime))
        }
      </CountdownCircleTimer>
      <CountdownCircleTimer
        {...timerProps}
        key={`m-${currentEndTime}`}
        colors="#cbd5e8"
        duration={HOUR_SECONDS}
        initialRemainingTime={remainingTime % HOUR_SECONDS}
        onComplete={(totalElapsedTime) => [
          remainingTime - totalElapsedTime > MINUTE_SECONDS,
          LOOP_DELAY_MS,
        ]}
      >
        {({ elapsedTime = 0 }) =>
          renderTime("m", getTimeMinutes(HOUR_SECONDS - elapsedTime))
        }
      </CountdownCircleTimer>
      <CountdownCircleTimer
        {...timerProps}
        key={`s-${currentEndTime}`}
        colors="#f4cae4"
        duration={MINUTE_SECONDS}
        initialRemainingTime={remainingTime % MINUTE_SECONDS}
        onComplete={(totalElapsedTime) => [
          remainingTime - totalElapsedTime > 0,
          LOOP_DELAY_MS,
        ]}
      >
        {({ elapsedTime = 0 }) => renderTime("s", getTimeSeconds(elapsedTime))}
      </CountdownCircleTimer>
    </Flex>
  );
};
