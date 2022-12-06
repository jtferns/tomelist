import { Flex, Link } from "@theme-ui/components";
import { NavLink, useMatch } from "react-router-dom";
import { EventData } from "../hooks/useGetEventData";

type NavHeaderProps = {
  eventData: EventData;
};
export const NavHeader = ({ eventData }: NavHeaderProps) => {
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
            href={eventData.link}
          >
            {eventData.label || "Loading..."}
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
              color: useMatch("/objectives") != null ? "#f0c" : "#4d4d4d",
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
              color: useMatch("/exchanges") != null ? "#f0c" : "#4d4d4d",
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
