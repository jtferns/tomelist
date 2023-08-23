import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Container, ThemeUIProvider } from "theme-ui";
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
      <ThemeUIProvider theme={theme}>
        <Container p={2}>
          <NavHeader eventData={eventData} />
          <Routes>
            <Route path="/*" element={<Info eventData={eventData} />} />
            <Route
              path="*"
              element={<p>Could not find the page you're looking for 😥</p>}
            />
          </Routes>
        </Container>
      </ThemeUIProvider>
    </BrowserRouter>
  );
};
