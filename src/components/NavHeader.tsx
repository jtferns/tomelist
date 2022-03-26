import { Flex, Link } from "@theme-ui/components";
import { NavLink, useRouteMatch } from "react-router-dom";

export const NavHeader = () => {
  return (
    <>
      <Flex sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Flex sx={{ flexShrink: 1 }}>
          <Link
            sx={{
              fontWeight: 500,
              fontSize: "1.5rem",
              textDecoration: "none",
            }}
            target="_blank"
            rel="noreferrer"
            href="https://na.finalfantasyxiv.com/lodestone/special/mogmog-collection/202203/dceh8sj926"
          >
            Scripture
          </Link>
        </Flex>
        <Flex
          as="nav"
          sx={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "space-evenly",
          }}
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
      </Flex>
    </>
  );
};
