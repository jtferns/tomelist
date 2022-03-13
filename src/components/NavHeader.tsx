import { Flex } from "@theme-ui/components";
import { NavLink, useRouteMatch } from "react-router-dom";

export const NavHeader = () => {
  return (
    <Flex
      as="nav"
      sx={{ alignItems: "center", justifyContent: "space-evenly" }}
    >
      <NavLink
        style={{
          color: useRouteMatch("/objectives") != null ? "#f0c" : "#4d4d4d",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "1.5rem",
          transition: "color .2s ease-in",
        }}
        to="/objectives"
      >
        Objectives
      </NavLink>
      <NavLink
        style={{
          color: useRouteMatch("/exchanges") != null ? "#f0c" : "#4d4d4d",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "1.5rem",
          transition: "color .2s ease-in",
        }}
        to="/exchanges"
      >
        Exchanges
      </NavLink>
    </Flex>
  );
};
