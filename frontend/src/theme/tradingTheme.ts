export type ThemeMode = "light" | "dark";

export const tradingTheme = {
    light: {
        mode: "light",

        app: {
            bg: "#f8fafc",
            panelBg: "#ffffff",
            cardBg: "#ffffff",
            topbarBg: "#ffffff",
            toolbarBg: "#ffffff",

            border: "#e5e7eb",
            borderSoft: "#f1f5f9",

            text: "#374151",
            textStrong: "#111827",
            textMuted: "#6b7280",

            inputBg: "#ffffff",
            buttonBg: "#111827",
            buttonText: "#ffffff",
            buttonActiveBg: "#f1f3f6",
            buttonActiveText: "#111827",
            buttonHoverBg: "#f8fafc",
        },

        chart: {
            background: "#ffffff",
            textColor: "#111827",

            gridLine: "#f1f5f9",
            border: "#e5e7eb",
            crosshair: "#6b7280",

            candleGreen: "#089981",
            candleRed: "#f23645",

            volumeGreen: "#92d2cc",
            volumeRed: "#f7a9a7",
        },

        drawing: {
            trendline: "#2563eb",
            noteDefault: "#111827",

            positionLongFill: "rgba(16, 185, 129, 0.22)",
            positionShortFill: "rgba(239, 68, 68, 0.22)",

            labelText: "#ffffff",
            handleBg: "#ffffff",
        },
    },

    dark: {
        mode: "dark",

        app: {
            bg: "#0f0f0f",
            panelBg: "#0f0f0f",
            cardBg: "#151515",
            topbarBg: "#0f0f0f",
            toolbarBg: "#0f0f0f",

            border: "#2a2a2a",
            borderSoft: "#1f1f1f",

            text: "#d1d4dc",
            textStrong: "#ffffff",
            textMuted: "#787b86",

            inputBg: "#111111",
            buttonBg: "#1f1f1f",
            buttonText: "#ffffff",
            buttonActiveBg: "#1f1f1f",
            buttonActiveText: "#ffffff",
            buttonHoverBg: "#151515",
        },

        chart: {
            background: "#0f0f0f",
            textColor: "#d1d4dc",

            gridLine: "#1f1f1f",
            border: "#2a2a2a",
            crosshair: "#787b86",

            candleGreen: "#089981",
            candleRed: "#f23645",

            volumeGreen: "#1a5a54",
            volumeRed: "#7f312f",
        },

        drawing: {
            trendline: "#2962ff",
            noteDefault: "#d1d4dc",

            positionLongFill: "rgba(8, 153, 129, 0.22)",
            positionShortFill: "rgba(242, 54, 69, 0.22)",

            labelText: "#ffffff",
            handleBg: "#0f0f0f",
        },
    },
} as const;

export type TradingTheme = (typeof tradingTheme)[ThemeMode];