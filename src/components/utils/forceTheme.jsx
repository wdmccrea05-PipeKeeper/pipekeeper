export function forcePipekeeperTheme() {
  const root = document.documentElement;

  const vars = {
    "--background": "214 53% 9%",
    "--foreground": "40 75% 87%",
    "--card": "214 47% 14%",
    "--card-foreground": "40 75% 87%",
    "--primary": "0 41% 39%",
    "--primary-foreground": "40 75% 87%",
    "--secondary": "212 33% 21%",
    "--secondary-foreground": "40 75% 87%",
    "--accent": "37 52% 81%",
    "--accent-foreground": "214 53% 9%",
    "--muted": "213 43% 18%",
    "--muted-foreground": "39 45% 78%",
    "--border": "37 20% 30%",
    "--input": "37 20% 30%",
    "--ring": "37 52% 81%",
  };

  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}