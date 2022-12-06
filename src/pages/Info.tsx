import { Box, Container, Text } from "@theme-ui/components";
import { sumBy } from "lodash";
import { useCallback } from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import pJson from "../../package.json";
import { EventItem } from "../components/EventItem";
import { ExchangeItem } from "../components/ExchangeItem";
import { Header } from "../components/Header";
import {
  EventData,
  EventExchange,
  InstanceObjective,
} from "../hooks/useGetEventData";
import { usePersistReducer } from "../hooks/usePersistReducer";

type InfoProps = {
  eventData: EventData;
};
export const Info = ({ eventData }: InfoProps) => {
  const [state, dispatch] = usePersistReducer();

  const totalRequiredTomes = Math.max(
    sumBy(
      eventData.exchange,
      (e: EventExchange) =>
        (state.exchangeSelections[e.name] || 0) * e.tomestonesCost
    ),
    0
  );
  const onTomesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({
        type: "setTomes",
        payload: parseInt(e.target.value as string),
      }),
    [dispatch]
  );
  const addRun = useCallback(
    (io: InstanceObjective) =>
      dispatch({
        type: "applyObjectiveRun",
        payload: {
          name: io.name,
          tomes: io.tomestonesCount,
          type: "add",
        },
      }),
    [dispatch]
  );
  const removeRun = useCallback(
    (io: InstanceObjective) =>
      dispatch({
        type: "applyObjectiveRun",
        payload: {
          name: io.name,
          tomes: io.tomestonesCount,
          type: "remove",
        },
      }),
    [dispatch]
  );
  const addSelection = useCallback(
    (ee: EventExchange) =>
      dispatch({
        type: "applyExchangeSelection",
        payload: {
          name: ee.name,
          type: "add",
        },
      }),
    [dispatch]
  );
  const removeSelection = useCallback(
    (ee: EventExchange) =>
      dispatch({
        type: "applyExchangeSelection",
        payload: {
          name: ee.name,
          type: "remove",
        },
      }),
    [dispatch]
  );

  return (
    <Container p={2}>
      <Switch>
        <Route path="/exchanges">
          <Header
            startDate={eventData.startDate}
            endDate={eventData.endDate}
            currentTomestones={state.currentTomestones}
            totalRequiredTomes={totalRequiredTomes}
            onTomesChange={onTomesChange}
          >
            {eventData.exchange.map((e, i) => (
              <ExchangeItem
                key={`${i}-${e.type}`}
                exchange={e}
                tomesCount={state.currentTomestones}
                selectionCount={state.exchangeSelections[e.name]}
                addSelection={addSelection}
                removeSelection={removeSelection}
              />
            ))}
          </Header>
        </Route>
        <Route path="/objectives">
          <Header
            startDate={eventData.startDate}
            endDate={eventData.endDate}
            currentTomestones={state.currentTomestones}
            totalRequiredTomes={totalRequiredTomes}
            onTomesChange={onTomesChange}
          >
            {eventData.objectives.map((o, i) => (
              <EventItem
                key={`${i}-${o.type}`}
                objective={o}
                tomesCost={totalRequiredTomes - state.currentTomestones}
                addRun={addRun}
                removeRun={removeRun}
              />
            ))}
          </Header>
        </Route>
        <Route path="/">
          <Redirect to="/objectives" />
        </Route>
      </Switch>
      <Box
        sx={{
          textAlign: "center",
          position: "relative",
          boxShadow: "0px -3px 10px #1a1a1a",
        }}
      >
        <Text sx={{ fontSize: "8px" }}>
          All referenced content are subject to © 2010 - 2022 SQUARE ENIX CO.,
          LTD. All Rights Reserved. | Tomelist v{pJson.version}
        </Text>
      </Box>
    </Container>
  );
};
