import { useMemo, useState } from "react";
import CandleChart from "../components/chart/CandleChart";
import SymbolSearch from "../components/trading/SymbolSearch";
import { useMarket } from "../hooks/useMarket";

const timeframes = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

export default function DashboardPage() {
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [timeframe, setTimeframe] = useState<string>("1h");

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

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "20px" }}>Trading Dashboard</h1>

      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <label>Symbol </label>
          <SymbolSearch selectedSymbol={symbol} onSelectSymbol={setSymbol} />
        </div>

        <div>
          <label htmlFor="timeframe-select">Timeframe </label>
          <select
            id="timeframe-select"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            {timeframes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <button onClick={() => void refetch()}>Refresh</button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            background: "#fff",
          }}
        >
          <p style={{ margin: 0, color: "#6b7280" }}>Selected Symbol</p>
          <h2 style={{ marginTop: "8px" }}>{symbol}</h2>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            background: "#fff",
          }}
        >
          <p style={{ margin: 0, color: "#6b7280" }}>Current Price</p>
          <h2 style={{ marginTop: "8px" }}>
            {currentPrice ? currentPrice.price.toLocaleString() : "--"}
          </h2>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            background: "#fff",
          }}
        >
          <p style={{ margin: 0, color: "#6b7280" }}>Last Close</p>
          <h2 style={{ marginTop: "8px" }}>
            {lastClose !== null ? lastClose.toLocaleString() : "--"}
          </h2>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            background: "#fff",
          }}
        >
          <p style={{ margin: 0, color: "#6b7280" }}>Candles Loaded</p>
          <h2 style={{ marginTop: "8px" }}>
            {candles.length}/{maxCandles}
          </h2>
        </div>
      </div>

      {loading && <p>Loading market data...</p>}
      {loadingMore && <p>Loading older candles...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px",
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
          Candlestick Chart - {symbol} / {timeframe}
        </h3>

        <CandleChart
          data={candles}
          symbol={symbol}
          timeframe={timeframe}
          onLoadMore={loadMoreCandles}
        />
      </div>
    </div>
  );
}