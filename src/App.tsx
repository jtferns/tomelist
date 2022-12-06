import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { Container, ThemeProvider } from "theme-ui";
import { NavHeader } from "./components/NavHeader";
import { useGetEventData } from "./hooks/useGetEventData";
import { useUpdateTitle } from "./hooks/useUpdateTitle";
import { Info } from "./pages/Info";
import theme from "./theme";

export const App = () => {
  useUpdateTitle();
  const eventData = useGetEventData();
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Container p={2}>
          <NavHeader eventData={eventData} />
          <Switch>
            <Route path="/">
              <Info eventData={eventData} />
            </Route>
          </Switch>
        </Container>
      </ThemeProvider>
    </BrowserRouter>
  );
};
