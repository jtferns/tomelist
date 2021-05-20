import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { Container, ThemeProvider } from "theme-ui";
import { NavHeader } from "./components/NavHeader";
import { useUpdateTitle } from "./hooks/useUpdateTitle";
import { Info } from "./pages/Info";
import theme from "./theme";

export const App = () => {
  useUpdateTitle();
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Container p={2}>
          <NavHeader />
          <Switch>
            <Route path="/">
              <Info />
            </Route>
          </Switch>
        </Container>
      </ThemeProvider>
    </BrowserRouter>
  );
};
