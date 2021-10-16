import { faMemory } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const TomeIcon = () => (
  <FontAwesomeIcon
    icon={faMemory}
    inverse
    size="xs"
    flip="horizontal"
    transform={{ rotate: 75 }}
  />
);
