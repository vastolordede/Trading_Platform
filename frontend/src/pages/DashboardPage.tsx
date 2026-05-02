import { useMemo, useState } from "react";
import CandleChart from "../components/chart/CandleChart";
import SymbolSearch from "../components/trading/SymbolSearch";
import { useMarket } from "../hooks/useMarket";
import { tradingTheme, ThemeMode } from "../theme/tradingTheme";

const timeframes = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

export default function DashboardPage() {
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [timeframe, setTimeframe] = useState<string>("1h");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const theme = tradingTheme[themeMode];

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const {
    candles,
    currentPrice,
    loading,
    loadingMore,
    error,
    refetch,
    loadMoreCandles,
    maxCandles,
  } = useMarket(symbol, timeframe);

  const lastClose = useMemo(() => {
    if (!candles.length) return null;
    return candles[candles.length - 1].close;
  }, [candles]);

  const latestCandle = useMemo(() => {
    if (!candles.length) return null;
    return candles[candles.length - 1];
  }, [candles]);

  const chartInfoItems = useMemo(
    () => [
      {
        label: "Symbol",
        value: symbol,
      },
      {
        label: "TF",
        value: timeframe,
      },
      {
        label: "Price",
        value: currentPrice ? currentPrice.price.toLocaleString() : "--",
      },
      {
        label: "Close",
        value: lastClose !== null ? lastClose.toLocaleString() : "--",
      },
      {
        label: "Candles",
        value: `${candles.length}/${maxCandles}`,
      },
    ],
    [symbol, timeframe, currentPrice, lastClose, candles.length, maxCandles]
  );

  const renderDynamicDataPanel = () => {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            border: `1px solid ${theme.app.border}`,
            borderRadius: 12,
            padding: 14,
            background: theme.app.cardBg,
            color: theme.app.text,
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>
            Dynamic Data
          </h3>

          <p
            style={{
              margin: 0,
              color: theme.app.textMuted,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Khu vực này tạm thời để trống. Sau này sẽ dùng để hiển thị order,
            position, trade history hoặc thông tin drawing đang được chọn.
          </p>
        </div>

        <div
          style={{
            border: `1px solid ${theme.app.border}`,
            borderRadius: 12,
            padding: 14,
            background: theme.app.cardBg,
            color: theme.app.text,
            flex: 1,
            minHeight: 260,
          }}
        >
          <p style={{ margin: 0, color: theme.app.textMuted, fontSize: 13 }}>
            No dynamic table data yet.
          </p>

          <div
            style={{
              marginTop: 14,
              border: `1px dashed ${theme.app.border}`,
              borderRadius: 10,
              height: 170,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.app.textMuted,
              fontSize: 13,
            }}
          >
            Placeholder table area
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${theme.app.border}`,
            borderRadius: 12,
            padding: 14,
            background: theme.app.cardBg,
            color: theme.app.text,
          }}
        >
          <h4 style={{ margin: 0, marginBottom: 10, fontSize: 15 }}>
            Latest Candle
          </h4>

          {latestCandle ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 7,
                fontSize: 13,
              }}
            >
              <span style={{ color: theme.app.textMuted }}>Open</span>
              <strong>{latestCandle.open.toLocaleString()}</strong>

              <span style={{ color: theme.app.textMuted }}>High</span>
              <strong>{latestCandle.high.toLocaleString()}</strong>

              <span style={{ color: theme.app.textMuted }}>Low</span>
              <strong>{latestCandle.low.toLocaleString()}</strong>

              <span style={{ color: theme.app.textMuted }}>Close</span>
              <strong>{latestCandle.close.toLocaleString()}</strong>

              <span style={{ color: theme.app.textMuted }}>Volume</span>
              <strong>{latestCandle.volume.toLocaleString()}</strong>
            </div>
          ) : (
            <p style={{ margin: 0, color: theme.app.textMuted, fontSize: 13 }}>
              No candle loaded.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        height: "100vh",
        background: theme.app.bg,
        color: theme.app.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar nhỏ giống TradingView */}
      <header
        style={{
          height: 52,
          padding: "0 18px",
          background: theme.app.topbarBg,
          borderBottom: `1px solid ${theme.app.border}`,
          color: theme.app.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            Trading Dashboard
          </h1>

          <div
            style={{
              width: 1,
              height: 22,
              background: theme.app.border,
            }}
          />

          <div
            style={{
              fontSize: 13,
              color: theme.app.text,
              whiteSpace: "nowrap",
            }}
          >
            <strong>{symbol}</strong>
            <span style={{ color: theme.app.textMuted }}> / </span>
            <strong>{timeframe}</strong>
          </div>

          {loading && (
            <span style={{ fontSize: 12, color: theme.app.textMuted }}>
              Loading...
            </span>
          )}

          {loadingMore && (
            <span style={{ fontSize: 12, color: theme.app.textMuted }}>
              Loading more...
            </span>
          )}

          {error && (
            <span style={{ fontSize: 12, color: theme.chart.candleRed }}>{error}</span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 130,
            }}
          >
            <SymbolSearch selectedSymbol={symbol} onSelectSymbol={setSymbol} />
          </div>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={{
              height: 30,
              minWidth: 68,
              border: `1px solid ${theme.app.border}`,
              borderRadius: 7,
              padding: "0 8px",
              background: theme.app.inputBg,
              color: theme.app.text,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {timeframes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              height: 30,
              border: `1px solid ${theme.app.border}`,
              borderRadius: 7,
              background: theme.app.buttonBg,
              color: theme.app.buttonText,
              padding: "0 12px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {themeMode === "dark" ? "Light" : "Dark"}
          </button>
          <button
            onClick={() => void refetch()}
            style={{
              height: 30,
              border: `1px solid ${theme.app.border}`,
              borderRadius: 7,
              background: theme.app.buttonBg,
              color: theme.app.buttonText,
              padding: "0 12px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            alignItems: "stretch",
          }}
        >
          {/* Chart left 4 phần */}
          <section
            style={{
              background: theme.app.panelBg,
              color: theme.app.text,
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRight: `1px solid ${theme.app.border}`,
            }}
          >
            <div
              style={{
                height: 42,
                padding: "0 14px",
                borderBottom: `1px solid ${theme.app.border}`,
                background: theme.app.panelBg,
                color: theme.app.text,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                Candlestick Chart - {symbol} / {timeframe}
              </h3>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                {chartInfoItems.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      minWidth: "fit-content",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: theme.app.textMuted,
                        lineHeight: 1.1,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: theme.app.textStrong,
                        lineHeight: 1.1,
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
              }}
            >
              <CandleChart
                data={candles}
                symbol={symbol}
                timeframe={timeframe}
                theme={theme}
                onLoadMore={loadMoreCandles}
              />
            </div>
          </section>

          {/* Right 2 phần */}
          <aside
            style={{
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              padding: 12,
              overflow: "auto",
              background: theme.app.bg,
              borderLeft: `1px solid ${theme.app.border}`,
              color: theme.app.text,
            }}
          >
            {renderDynamicDataPanel()}
          </aside>
        </div>
      </main>
    </div>
  );
}