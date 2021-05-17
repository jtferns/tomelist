import React from "react";
// import logo from "./logo.svg";
import { Container, Flex, ThemeProvider } from "theme-ui";
import theme from "./theme";
import { Info } from "./pages/Info";
import { BrowserRouter, NavLink, Route, Switch } from "react-router-dom";
// import './App.css';

export const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Container p={2}>
          <Flex
            as="nav"
            sx={{ alignItems: "center", justifyContent: "space-evenly" }}
          >
            <NavLink
              style={{ color: "#f0c", textDecoration: "none", fontWeight: 700 }}
              to="/objectives"
            >
              Objectives
            </NavLink>
            <NavLink
              style={{ color: "#f0c", textDecoration: "none", fontWeight: 700 }}
              to="/exchanges"
            >
              Exchanges
            </NavLink>
          </Flex>
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
