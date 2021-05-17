import {
  Box,
  Container,
  Divider,
  Flex,
  Heading,
  Input,
  Link,
  Progress,
  Text,
} from "@theme-ui/components";
import { useCallback } from "react";
import { EventItem } from "../components/EventItem";
import { ExchangeItem } from "../components/ExchangeItem";
import { Switch, Route, Redirect } from "react-router-dom";
import pJson from "../../package.json";

import {
  EventExchange,
  InstanceObjective,
  useGetEventData,
} from "../hooks/useGetEventData";
import { usePersistReducer } from "../hooks/usePersistReducer";
import { sumBy } from "lodash";

export const Info = () => {
  const eventData = useGetEventData();
  const [state, dispatch] = usePersistReducer();

  const totalRequiredTomes = sumBy(
    eventData.exchange,
    (e: EventExchange) =>
      (state.exchangeSelections[e.name] || 0) * e.tomestonesCost
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
          <>
            <Flex sx={{ alignItems: "center" }}>
              <Box p={2}>
                <Heading>
                  <Link
                    sx={{
                      textDecoration: "none",
                    }}
                    target="_blank"
                    rel="noreferrer"
                    href="https://na.finalfantasyxiv.com/lodestone/special/mogmog-collection/202105/dubrw051tv"
                  >
                    Pageantry
                  </Link>{" "}
                  Exchanges
                </Heading>
              </Box>
              <Box p={2} sx={{ flex: "1 1 auto" }}>
                <Progress
                  max={totalRequiredTomes}
                  value={state.currentTomestones}
                >
                  {`${(
                    (state.currentTomestones / totalRequiredTomes) *
                    100
                  ).toFixed(1)}%`}
                </Progress>
              </Box>
              <Box p={2}>
                <Input
                  type="number"
                  value={state.currentTomestones}
                  onChange={onTomesChange}
                />
              </Box>
              <Box p={2}>
                <Text>{` / ${totalRequiredTomes}`}</Text>
              </Box>
            </Flex>
            <Divider />
            <Box p={4} sx={{ height: "calc(100vh - 168px)", overflow: "auto" }}>
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
            </Box>
          </>
        </Route>
        <Route path="/objectives">
          <>
            <Flex sx={{ alignItems: "center" }}>
              <Box p={2}>
                <Heading>
                  <Link
                    sx={{
                      textDecoration: "none",
                    }}
                    target="_blank"
                    rel="noreferrer"
                    href="https://na.finalfantasyxiv.com/lodestone/special/mogmog-collection/202105/dubrw051tv"
                  >
                    Pageantry
                  </Link>{" "}
                  Objectives
                </Heading>
              </Box>
              <Box p={2} sx={{ flex: "1 1 auto" }}>
                <Progress
                  max={totalRequiredTomes}
                  value={state.currentTomestones}
                >
                  {`${(
                    (state.currentTomestones / totalRequiredTomes) *
                    100
                  ).toFixed(1)}%`}
                </Progress>
              </Box>
              <Box p={2}>
                <Input
                  type="number"
                  value={state.currentTomestones}
                  onChange={onTomesChange}
                />
              </Box>
              <Box p={2}>
                <Text>{` / ${totalRequiredTomes}`}</Text>
              </Box>
            </Flex>
            <Divider />
            <Box p={4} sx={{ height: "calc(100vh - 168px)", overflow: "auto" }}>
              {eventData.objectives.map((o, i) => (
                <EventItem
                  key={`${i}-${o.type}`}
                  objective={o}
                  tomesCost={totalRequiredTomes - state.currentTomestones}
                  addRun={addRun}
                  removeRun={removeRun}
                />
              ))}
            </Box>
          </>
        </Route>
        <Route path="/">
          <Redirect to="/objectives" />
        </Route>
      </Switch>
      <Box sx={{ textAlign: "center" }}>
        <Text sx={{ fontSize: "8px" }}>
          All referenced content are subject to © 2010 - 2021 SQUARE ENIX CO.,
          LTD. All Rights Reserved. | Tomelist v{pJson.version}
        </Text>
      </Box>
    </Container>
  );
};
