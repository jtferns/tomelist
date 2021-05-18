import { Theme } from "@theme-ui/css";

const theme: Theme = {
  space: [0, 4, 8, 16, 32, 64, 128, 256, 512],
  fonts: {
    body: '"Philosopher", "Avenir Next", system-ui, sans-serif',
    heading: "inherit",
    monospace: '"Open Sans", "Menlo, monospace"',
  },
  badges: {
    outline: {
      color: "secondary",
      bg: "transparent",
      boxShadow: "inset 0 0 0 1px",
    },
  },
  buttons: {
    add: {
      color: "background",
      bg: "add",
      "&:hover": {
        bg: "btnbg",
      },
    },
    remove: {
      color: "background",
      bg: "remove",
      "&:hover": {
        bg: "btnbg",
      },
    },
  },
  links: {
    insufficient: {
      fontStyle: "italic",
      opacity: 0.5,
      color: "primary",
      "&:visited": {
        color: "btnbg",
      },
      "&:hover": {
        color: "secondary",
      },
    },
    sufficient: {
      color: "primary",
      "&:visited": {
        color: "btnbg",
      },
      "&:hover": {
        color: "secondary",
      },
    },
  },
  text: {
    insufficient: {
      fontStyle: "italic",
      opacity: 0.5,
    },
  },

  fontSizes: [12, 14, 16, 20, 24, 32, 48, 64, 96],
  fontWeights: {
    body: 400,
    heading: 600,
    bold: 700,
  },
  lineHeights: {
    body: 1.75,
    heading: 1.25,
  },
  colors: {
    text: "#efedf5",
    background: "#1a1a1a",
    primary: "#0fc",
    secondary: "#0cf",
    highlight: "#f0c",
    muted: "#4d4d4d",
    add: "#80b1d3",
    remove: "#fb8072",
    btnbg: "#d9d9d9",
  },
  styles: {
    root: {
      fontFamily: "body",
      lineHeight: "body",
      fontWeight: "body",
    },
    h1: {
      color: "text",
      fontFamily: "heading",
      lineHeight: "heading",
      fontWeight: "heading",
      fontSize: 5,
    },
    h2: {
      color: "text",
      fontFamily: "heading",
      lineHeight: "heading",
      fontWeight: "heading",
      fontSize: 4,
    },
    h3: {
      color: "text",
      fontFamily: "heading",
      lineHeight: "heading",
      fontWeight: "heading",
      fontSize: 3,
    },
    h4: {
      color: "text",
      fontFamily: "heading",
      lineHeight: "heading",
      fontWeight: "heading",
      fontSize: 2,
    },
    h5: {
      color: "text",
      fontFamily: "heading",
      lineHeight: "heading",
      fontWeight: "heading",
      fontSize: 1,
    },
    h6: {
      color: "text",
      fontFamily: "heading",
      lineHeight: "heading",
      fontWeight: "heading",
      fontSize: 0,
    },
    p: {
      color: "text",
      fontFamily: "body",
      fontWeight: "body",
      lineHeight: "body",
    },
    a: {
      color: "primary",
      "&:visited": {
        color: "btnbg",
      },
      "&:hover": {
        color: "secondary",
      },
    },
    pre: {
      fontFamily: "monospace",
      overflowX: "auto",
      code: {
        color: "inherit",
      },
    },
    code: {
      fontFamily: "monospace",
      fontSize: "inherit",
    },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
    },
    th: {
      textAlign: "left",
      borderBottomStyle: "solid",
    },
    td: {
      textAlign: "left",
      borderBottomStyle: "solid",
    },
    img: {
      maxWidth: "100%",
    },
  },
};

export default theme;
export type ExactTheme = typeof theme;
