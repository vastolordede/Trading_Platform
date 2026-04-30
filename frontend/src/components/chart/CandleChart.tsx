import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CrosshairMode,
  LineStyle,
  Time,
  Logical,
} from "lightweight-charts";
import { CandleResponseItem } from "../../api/market.api";

type LoadMoreMode = "normal" | "fast";

type DrawingTool =
  | "cursor"
  | "trendline"
  | "noteLine"
  | "longPosition"
  | "shortPosition";

type Props = {
  data: CandleResponseItem[];
  symbol: string;
  timeframe: string;
  onLoadMore?: (mode?: LoadMoreMode) => void;
};

type ChartPoint = {
  time: UTCTimestamp;
  price: number;
};

type TrendLineDrawing = {
  id: string;
  type: "trendline";
  p1: ChartPoint;
  p2: ChartPoint;
};

type NoteLineDrawing = {
  id: string;
  type: "noteLine";
  price: number;
  note: string;
  color: string;
};

type PositionDrawing = {
  id: string;
  type: "position";
  side: "long" | "short";

  entryTime: UTCTimestamp;
  endTime: UTCTimestamp;

  entryPrice: number;
  tpPrice: number;
  slPrice: number;

  qty: number;
  tickSize: number;
  tickValue: number;
};

type Drawing = TrendLineDrawing | NoteLineDrawing | PositionDrawing;

type DragState =
  | {
    kind: "trendline-point";
    id: string;
    point: "p1" | "p2";
  }
  | {
    kind: "trendline-move";
    id: string;
    start: ChartPoint;
    originalP1: ChartPoint;
    originalP2: ChartPoint;
  }
  | {
    kind: "noteLine-move";
    id: string;
  }
  | {
    kind: "position-tp";
    id: string;
  }
  | {
    kind: "position-sl";
    id: string;
  }
  | {
    kind: "position-end";
    id: string;
  }
  | {
    kind: "position-move";
    id: string;
    start: ChartPoint;
    original: PositionDrawing;
  };

type OverlayTrendLine = TrendLineDrawing & {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

type OverlayNoteLine = NoteLineDrawing & {
  x1: number;
  x2: number;
  y: number;
  labelX: number;
  labelWidth: number;
};

type OverlayPosition = PositionDrawing & {
  left: number;
  right: number;
  zoneWidth: number;
  entryY: number;
  tpY: number;
  slY: number;
  profitTop: number;
  profitBottom: number;
  lossTop: number;
  lossBottom: number;
};

type OverlayItem = OverlayTrendLine | OverlayNoteLine | OverlayPosition;

const NOTE_COLORS = [
  "#111827",
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#f59e0b",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

const CHART_COLORS = {
  green: "#089981",
  red: "#f23645",
  volumeGreen: "#92d2cc",
  volumeRed: "#f7a9a7",
};

const toTimestamp = (time: Time | null): UTCTimestamp | null => {
  if (time === null) return null;

  if (typeof time === "number") {
    return time as UTCTimestamp;
  }

  if (typeof time === "string") {
    return Math.floor(new Date(time).getTime() / 1000) as UTCTimestamp;
  }

  return null;
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const clampTime = (time: number): UTCTimestamp => {
  return Math.max(0, Math.floor(time)) as UTCTimestamp;
};

const timeframeToSeconds = (tf: string): number => {
  const map: Record<string, number> = {
    "1m": 60,
    "3m": 180,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
  };

  return map[tf] || 3600;
};

const timeToXCoordinate = (
  chart: IChartApi,
  time: UTCTimestamp,
  candles: CandleResponseItem[],
  tf: string
): number | null => {
  const directX = chart.timeScale().timeToCoordinate(time);

  if (directX !== null) {
    return directX;
  }

  if (!candles.length) return null;

  const firstOpenTime = Math.floor(candles[0].openTime / 1000);
  const secondsPerBar = timeframeToSeconds(tf);

  const logicalIndex = (time - firstOpenTime) / secondsPerBar;

  return chart.timeScale().logicalToCoordinate(logicalIndex as Logical);
};

const createDefaultPosition = (
  point: ChartPoint,
  tf: string,
  side: "long" | "short"
): PositionDrawing => {
  const range = point.price * 0.01;
  const duration = timeframeToSeconds(tf) * 60;
  const isLong = side === "long";

  return {
    id: makeId(),
    type: "position",
    side,
    entryTime: point.time,
    endTime: clampTime(point.time + duration),
    entryPrice: point.price,
    tpPrice: isLong ? point.price + range : point.price - range,
    slPrice: isLong ? point.price - range : point.price + range,

    qty: 1,
    tickSize: 0.01,
    tickValue: 0.01,
  };
};
const formatNumber = (value: number, digits = 2) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
};

const calculatePositionStats = (position: PositionDrawing) => {
  const isLong = position.side === "long";

  const targetMove = isLong
    ? position.tpPrice - position.entryPrice
    : position.entryPrice - position.tpPrice;

  const stopMove = isLong
    ? position.entryPrice - position.slPrice
    : position.slPrice - position.entryPrice;

  const targetPercent = (targetMove / position.entryPrice) * 100;
  const stopPercent = (stopMove / position.entryPrice) * 100;

  const targetTicks = Math.round(Math.abs(targetMove) / position.tickSize);
  const stopTicks = Math.round(Math.abs(stopMove) / position.tickSize);

  const targetAmount = Math.abs(targetMove) * position.qty;
  const stopAmount = Math.abs(stopMove) * position.qty;

  const riskReward =
    stopAmount > 0 ? targetAmount / stopAmount : 0;

  return {
    targetMove,
    stopMove,
    targetPercent,
    stopPercent,
    targetTicks,
    stopTicks,
    targetAmount,
    stopAmount,
    riskReward,
  };
};
const calculateOpenPnl = (
  position: PositionDrawing,
  currentPrice: number
) => {
  const isLong = position.side === "long";

  return isLong
    ? (currentPrice - position.entryPrice) * position.qty
    : (position.entryPrice - currentPrice) * position.qty;
};
export default function CandleChart({
  data,
  symbol,
  timeframe,
  onLoadMore,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const dataRef = useRef<CandleResponseItem[]>(data);
  const timeframeRef = useRef(timeframe);
  const hasInitialFitRef = useRef(false);
  const onLoadMoreRef = useRef<Props["onLoadMore"]>(onLoadMore);
  const lastLoadMoreAtRef = useRef(0);
  const dragStateRef = useRef<DragState | null>(null);
  const selectedToolRef = useRef<DrawingTool>("cursor");

  const [selectedTool, setSelectedTool] = useState<DrawingTool>("cursor");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [pendingPoints, setPendingPoints] = useState<ChartPoint[]>([]);
  const [renderVersion, setRenderVersion] = useState(0);

  const [noteColorPicker, setNoteColorPicker] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const [editingNote, setEditingNote] = useState<{
    id: string;
    value: string;
    x: number;
    y: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    hasInitialFitRef.current = false;
    lastLoadMoreAtRef.current = 0;
    setPendingPoints([]);
    setNoteColorPicker(null);
    setEditingNote(null);
  }, [symbol, timeframe]);

  const getPointFromClient = (
    clientX: number,
    clientY: number
  ): ChartPoint | null => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const container = containerRef.current;

    if (!chart || !candleSeries || !container) return null;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const price = candleSeries.coordinateToPrice(y);
    if (price === null) return null;

    const rawTime = chart.timeScale().coordinateToTime(x);
    const directTime = toTimestamp(rawTime);

    if (directTime !== null) {
      return {
        time: directTime,
        price,
      };
    }

    const logical = chart.timeScale().coordinateToLogical(x);
    const currentData = dataRef.current;

    if (logical === null || !currentData.length) return null;

    const firstOpenTime = Math.floor(currentData[0].openTime / 1000);
    const secondsPerBar = timeframeToSeconds(timeframeRef.current);
    const estimatedTime = firstOpenTime + Math.round(logical) * secondsPerBar;

    return {
      time: clampTime(estimatedTime),
      price,
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 460,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#111827",
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: {
        borderColor: "#e5e7eb",
        scaleMargins: {
          top: 0.05,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 40,
        barSpacing: 8,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          visible: true,
          labelVisible: true,
          width: 1,
          style: LineStyle.LargeDashed,
          color: "#6b7280",
        },
        horzLine: {
          visible: true,
          labelVisible: true,
          width: 1,
          style: LineStyle.LargeDashed,
          color: "#6b7280",
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.green,
      downColor: CHART_COLORS.red,
      borderVisible: false,
      wickUpColor: CHART_COLORS.green,
      wickDownColor: CHART_COLORS.red,
      priceScaleId: "right",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const requestLoadMore = (mode: LoadMoreMode) => {
      const now = Date.now();
      const cooldown = mode === "fast" ? 2500 : 1200;

      if (now - lastLoadMoreAtRef.current < cooldown) return;

      lastLoadMoreAtRef.current = now;
      onLoadMoreRef.current?.(mode);
    };

    const handleVisibleRangeChange = () => {
      const logicalRange = chart.timeScale().getVisibleLogicalRange();

      if (!logicalRange) return;

      const visibleBars = logicalRange.to - logicalRange.from;
      const isNearLeftEdge = logicalRange.from < 8;
      const isVeryZoomedOut = visibleBars > 250;
      const isTooMuchLeftBlank = logicalRange.from < -30;

      if (isTooMuchLeftBlank || (isNearLeftEdge && isVeryZoomedOut)) {
        requestLoadMore("fast");
      } else if (isNearLeftEdge) {
        requestLoadMore("normal");
      }

      setRenderVersion((prev) => prev + 1);
    };

    const handleResize = () => {
      chart.applyOptions({
        width: container.clientWidth,
      });

      setRenderVersion((prev) => prev + 1);
    };

    const handleGlobalMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const point = getPointFromClient(event.clientX, event.clientY);
      if (!point) return;

      setDrawings((prev) =>
        prev.map((drawing) => {
          if (drawing.id !== dragState.id) return drawing;

          if (
            dragState.kind === "trendline-point" &&
            drawing.type === "trendline"
          ) {
            return {
              ...drawing,
              [dragState.point]: point,
            };
          }

          if (
            dragState.kind === "trendline-move" &&
            drawing.type === "trendline"
          ) {
            const deltaTime = point.time - dragState.start.time;
            const deltaPrice = point.price - dragState.start.price;

            return {
              ...drawing,
              p1: {
                time: clampTime(dragState.originalP1.time + deltaTime),
                price: dragState.originalP1.price + deltaPrice,
              },
              p2: {
                time: clampTime(dragState.originalP2.time + deltaTime),
                price: dragState.originalP2.price + deltaPrice,
              },
            };
          }

          if (
            dragState.kind === "noteLine-move" &&
            drawing.type === "noteLine"
          ) {
            return {
              ...drawing,
              price: point.price,
            };
          }

          if (dragState.kind === "position-tp" && drawing.type === "position") {
            return {
              ...drawing,
              tpPrice: point.price,
            };
          }

          if (dragState.kind === "position-sl" && drawing.type === "position") {
            return {
              ...drawing,
              slPrice: point.price,
            };
          }

          if (
            dragState.kind === "position-end" &&
            drawing.type === "position"
          ) {
            return {
              ...drawing,
              endTime: point.time,
            };
          }

          if (
            dragState.kind === "position-move" &&
            drawing.type === "position"
          ) {
            const deltaTime = point.time - dragState.start.time;
            const deltaPrice = point.price - dragState.start.price;

            return {
              ...drawing,
              entryTime: clampTime(dragState.original.entryTime + deltaTime),
              endTime: clampTime(dragState.original.endTime + deltaTime),
              entryPrice: dragState.original.entryPrice + deltaPrice,
              tpPrice: dragState.original.tpPrice + deltaPrice,
              slPrice: dragState.original.slPrice + deltaPrice,
            };
          }

          return drawing;
        })
      );

      setRenderVersion((prev) => prev + 1);
    };

    const handleGlobalMouseUp = () => {
      if (dragStateRef.current) {
        setSelectedTool("cursor");
      }

      dragStateRef.current = null;
      container.style.cursor = "crosshair";
    };

    const handleMouseDown = () => {
      if (selectedToolRef.current === "cursor") {
        container.style.cursor = "grabbing";
      }
    };

    const handleMouseUp = () => {
      if (!dragStateRef.current) {
        container.style.cursor = "crosshair";
      }
    };

    const handleMouseLeave = () => {
      if (!dragStateRef.current) {
        container.style.cursor = "crosshair";
      }
    };

    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);

      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const candleData = data.map((item) => ({
      time: Math.floor(item.openTime / 1000) as UTCTimestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    const volumeData = data.map((item) => ({
  time: Math.floor(item.openTime / 1000) as UTCTimestamp,
  value: item.volume,
  color: item.close >= item.open
    ? CHART_COLORS.volumeGreen
    : CHART_COLORS.volumeRed,
}));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    if (!hasInitialFitRef.current && data.length > 0) {
      chartRef.current?.timeScale().fitContent();

      chartRef.current?.timeScale().applyOptions({
        rightOffset: 40,
        barSpacing: 8,
      });

      hasInitialFitRef.current = true;
    }

    setRenderVersion((prev) => prev + 1);
  }, [data]);

  const handleChartClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === "cursor") return;
    if (dragStateRef.current) return;

    const point = getPointFromClient(event.clientX, event.clientY);
    if (!point) return;

    if (selectedTool === "trendline") {
      if (pendingPoints.length === 0) {
        setPendingPoints([point]);
        return;
      }

      setDrawings((prev) => [
        ...prev,
        {
          id: makeId(),
          type: "trendline",
          p1: pendingPoints[0],
          p2: point,
        },
      ]);

      setPendingPoints([]);
      setSelectedTool("cursor");
      return;
    }

    if (selectedTool === "noteLine") {
      setDrawings((prev) => [
        ...prev,
        {
          id: makeId(),
          type: "noteLine",
          price: point.price,
          note: "Note",
          color: "#111827",
        },
      ]);

      setPendingPoints([]);
      setSelectedTool("cursor");
      return;
    }

    if (selectedTool === "longPosition" || selectedTool === "shortPosition") {
      const side = selectedTool === "longPosition" ? "long" : "short";

      setDrawings((prev) => [
        ...prev,
        createDefaultPosition(point, timeframe, side),
      ]);

      setPendingPoints([]);
      setSelectedTool("cursor");
    }
  };

  const startDrag = (
    event: React.MouseEvent<SVGElement>,
    state: DragState
  ) => {
    event.preventDefault();
    event.stopPropagation();

    dragStateRef.current = state;

    if (containerRef.current) {
      containerRef.current.style.cursor = "grabbing";
    }
  };

  const startEditNoteText = (item: OverlayNoteLine) => {
    setEditingNote({
      id: item.id,
      value: item.note,
      x: item.labelX,
      y: item.y - 25,
      width: Math.max(100, item.labelWidth + 24),
    });
  };

  const commitEditingNote = () => {
    if (!editingNote) return;

    const nextValue = editingNote.value.trim() || "Note";

    setDrawings((prev) =>
      prev.map((item) => {
        if (item.id !== editingNote.id || item.type !== "noteLine") {
          return item;
        }

        return {
          ...item,
          note: nextValue,
        };
      })
    );

    setEditingNote(null);
    setSelectedTool("cursor");
  };

  const openNoteColorPicker = (
    event: React.MouseEvent<SVGElement>,
    drawing: NoteLineDrawing
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setNoteColorPicker({
      id: drawing.id,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const applyNoteColor = (id: string, color: string) => {
    setDrawings((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.type !== "noteLine") return item;

        return {
          ...item,
          color,
        };
      })
    );
  };

  const clearDrawings = () => {
    setDrawings([]);
    setPendingPoints([]);
    setNoteColorPicker(null);
    setEditingNote(null);
  };

  const overlayItems = useMemo<OverlayItem[]>(() => {
    renderVersion;

    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const container = containerRef.current;

    if (!chart || !candleSeries || !container) return [];

    const width = container.clientWidth;

    return drawings
      .map((drawing): OverlayItem | null => {
        if (drawing.type === "trendline") {
          const currentData = dataRef.current;

          const x1 = timeToXCoordinate(
            chart,
            drawing.p1.time,
            currentData,
            timeframeRef.current
          );

          const x2 = timeToXCoordinate(
            chart,
            drawing.p2.time,
            currentData,
            timeframeRef.current
          );
          const y1 = candleSeries.priceToCoordinate(drawing.p1.price);
          const y2 = candleSeries.priceToCoordinate(drawing.p2.price);

          if (x1 === null || x2 === null || y1 === null || y2 === null) {
            return null;
          }

          return {
            ...drawing,
            x1,
            x2,
            y1,
            y2,
          };
        }

        if (drawing.type === "noteLine") {
          const y = candleSeries.priceToCoordinate(drawing.price);

          if (y === null) return null;

          const labelWidth = Math.max(70, drawing.note.length * 8 + 20);

          return {
            ...drawing,
            x1: 0,
            x2: width,
            y,
            labelX: width - labelWidth - 18,
            labelWidth,
          };
        }

        if (drawing.type === "position") {
          const currentData = dataRef.current;

          const x1 = timeToXCoordinate(
            chart,
            drawing.entryTime,
            currentData,
            timeframeRef.current
          );

          const x2 = timeToXCoordinate(
            chart,
            drawing.endTime,
            currentData,
            timeframeRef.current
          );

          const entryY = candleSeries.priceToCoordinate(drawing.entryPrice);
          const tpY = candleSeries.priceToCoordinate(drawing.tpPrice);
          const slY = candleSeries.priceToCoordinate(drawing.slPrice);

          if (
            x1 === null ||
            x2 === null ||
            entryY === null ||
            tpY === null ||
            slY === null
          ) {
            return null;
          }

          const left = Math.min(x1, x2);
          const right = Math.max(x1, x2);
          const zoneWidth = Math.max(1, right - left);

          const profitTop = Math.min(tpY, entryY);
          const profitBottom = Math.max(tpY, entryY);

          const lossTop = Math.min(slY, entryY);
          const lossBottom = Math.max(slY, entryY);

          return {
            ...drawing,
            left,
            right,
            zoneWidth,
            entryY,
            tpY,
            slY,
            profitTop,
            profitBottom,
            lossTop,
            lossBottom,
          };
        }

        return null;
      })
      .filter((item): item is OverlayItem => item !== null);
  }, [drawings, renderVersion]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {(["cursor", "trendline", "noteLine"] as DrawingTool[]).map((tool) => (
          <button
            key={tool}
            type="button"
            onClick={() => {
              setSelectedTool(tool);
              setPendingPoints([]);
              setNoteColorPicker(null);
              setEditingNote(null);
            }}
            style={{
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: selectedTool === tool ? "#111827" : "#fff",
              color: selectedTool === tool ? "#fff" : "#111827",
              cursor: "pointer",
            }}
          >
            {tool === "cursor" && "Cursor"}
            {tool === "trendline" && "Trendline"}
            {tool === "noteLine" && "Note Line"}
          </button>
        ))}

        <select
          value={
            selectedTool === "longPosition" || selectedTool === "shortPosition"
              ? selectedTool
              : ""
          }
          onChange={(event) => {
            const value = event.target.value as DrawingTool | "";

            if (!value) return;

            setSelectedTool(value);
            setPendingPoints([]);
            setNoteColorPicker(null);
            setEditingNote(null);
          }}
          style={{
            padding: "6px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            background:
              selectedTool === "longPosition" ||
                selectedTool === "shortPosition"
                ? "#111827"
                : "#fff",
            color:
              selectedTool === "longPosition" ||
                selectedTool === "shortPosition"
                ? "#fff"
                : "#111827",
            cursor: "pointer",
          }}
        >
          <option value="">TP/SL</option>
          <option value="longPosition">Long TP/SL</option>
          <option value="shortPosition">Short TP/SL</option>
        </select>

        <button
          type="button"
          onClick={clearDrawings}
          style={{
            padding: "6px 10px",
            border: "1px solid #ef4444",
            borderRadius: 6,
            background: "#fff",
            color: "#ef4444",
            cursor: "pointer",
          }}
        >
          Clear
        </button>

        <span style={{ color: "#6b7280", fontSize: 13 }}>
          {selectedTool === "trendline" &&
            `Trendline: click 2 điểm (${pendingPoints.length}/2)`}
          {selectedTool === "noteLine" &&
            "Note Line: click để tạo, double click chữ để sửa, double click đường để đổi màu"}
          {selectedTool === "longPosition" && "Long TP/SL: click 1 lần để tạo"}
          {selectedTool === "shortPosition" &&
            "Short TP/SL: click 1 lần để tạo"}
        </span>
      </div>

      <div
        ref={containerRef}
        onClick={handleChartClick}
        style={{
          width: "100%",
          minHeight: 460,
          cursor: "crosshair",
          position: "relative",
        }}
      >
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {overlayItems.map((item) => {
            if (item.type === "trendline") {
              return (
                <g key={item.id}>
                  <line
                    x1={item.x1}
                    y1={item.y1}
                    x2={item.x2}
                    y2={item.y2}
                    stroke="#2563eb"
                    strokeWidth={2}
                    style={{ pointerEvents: "stroke", cursor: "grab" }}
                    onMouseDown={(event) =>
                      startDrag(event, {
                        kind: "trendline-move",
                        id: item.id,
                        start:
                          getPointFromClient(event.clientX, event.clientY) ||
                          item.p1,
                        originalP1: item.p1,
                        originalP2: item.p2,
                      })
                    }
                  />

                  <circle
                    cx={item.x1}
                    cy={item.y1}
                    r={5}
                    fill="#fff"
                    stroke="#2563eb"
                    strokeWidth={2}
                    style={{ pointerEvents: "all", cursor: "grab" }}
                    onMouseDown={(event) =>
                      startDrag(event, {
                        kind: "trendline-point",
                        id: item.id,
                        point: "p1",
                      })
                    }
                  />

                  <circle
                    cx={item.x2}
                    cy={item.y2}
                    r={5}
                    fill="#fff"
                    stroke="#2563eb"
                    strokeWidth={2}
                    style={{ pointerEvents: "all", cursor: "grab" }}
                    onMouseDown={(event) =>
                      startDrag(event, {
                        kind: "trendline-point",
                        id: item.id,
                        point: "p2",
                      })
                    }
                  />
                </g>
              );
            }

            if (item.type === "noteLine") {
              return (
                <g key={item.id}>
                  <line
                    x1={item.x1}
                    y1={item.y}
                    x2={item.x2}
                    y2={item.y}
                    stroke={item.color}
                    strokeWidth={2}
                    style={{ pointerEvents: "stroke", cursor: "grab" }}
                    onMouseDown={(event) =>
                      startDrag(event, {
                        kind: "noteLine-move",
                        id: item.id,
                      })
                    }
                    onDoubleClick={(event) => openNoteColorPicker(event, item)}
                  />

                  <text
                    x={item.labelX}
                    y={item.y - 6}
                    fontSize={13}
                    fill={item.color}
                    fontWeight={700}
                    style={{
                      pointerEvents: "all",
                      cursor: "text",
                      userSelect: "none",
                    }}
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      startEditNoteText(item);
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    {item.note}
                  </text>
                </g>
              );
            }

            if (item.type === "position") {
              const handleSize = 10;
              const handleX = item.left - handleSize / 2;
              const endHandleX = item.right - handleSize / 2;
              const isLong = item.side === "long";
              const stats = calculatePositionStats(item);

const latestCandle = dataRef.current[dataRef.current.length - 1];
const currentPrice = latestCandle?.close ?? item.entryPrice;
const openPnl = calculateOpenPnl(item, currentPrice);

const openPnlText =
  openPnl >= 0
    ? formatNumber(openPnl, 2)
    : `-${formatNumber(Math.abs(openPnl), 2)}`;

const targetText = `Target: ${formatNumber(
  Math.abs(stats.targetMove),
  2
)} (${formatNumber(Math.abs(stats.targetPercent), 2)}%) ${stats.targetTicks.toLocaleString()}, Amount: ${formatNumber(
  stats.targetAmount,
  2
)}`;

const stopText = `Stop: ${formatNumber(
  Math.abs(stats.stopMove),
  2
)} (${formatNumber(Math.abs(stats.stopPercent), 2)}%) ${stats.stopTicks.toLocaleString()}, Amount: ${formatNumber(
  stats.stopAmount,
  2
)}`;

const targetLabelColor = CHART_COLORS.green;
const entryLabelColor = openPnl >= 0 ? CHART_COLORS.green : CHART_COLORS.red;
const stopLabelColor = CHART_COLORS.red;

              const targetLabelWidth = Math.max(260, targetText.length * 7);
              const stopLabelWidth = Math.max(250, stopText.length * 7);
              const entryLabelWidth = 280;

              const targetLabelX = item.left + item.zoneWidth / 2 - targetLabelWidth / 2;
              const stopLabelX = item.left + item.zoneWidth / 2 - stopLabelWidth / 2;
              const entryLabelX = item.left + item.zoneWidth / 2 - entryLabelWidth / 2;

              // Long: target ở trên, stop ở dưới
              // Short: target ở dưới, stop ở trên
              const targetLabelY = isLong
                ? item.profitTop - 30
                : item.profitBottom + 6;

              const targetTextY = isLong
                ? item.profitTop - 14
                : item.profitBottom + 22;

              const stopLabelY = isLong
                ? item.lossBottom + 6
                : item.lossTop - 30;

              const stopTextY = isLong
                ? item.lossBottom + 22
                : item.lossTop - 14;

              return (
                <g key={item.id}>
                  <rect
                    x={item.left}
                    y={item.profitTop}
                    width={item.zoneWidth}
                    height={item.profitBottom - item.profitTop}
                    fill="rgba(16, 185, 129, 0.22)"
                    stroke={CHART_COLORS.green}
                    style={{ pointerEvents: "all", cursor: "grab" }}
                    onMouseDown={(event) =>
                      startDrag(event, {
                        kind: "position-move",
                        id: item.id,
                        start:
                          getPointFromClient(event.clientX, event.clientY) || {
                            time: item.entryTime,
                            price: item.entryPrice,
                          },
                        original: {
                          id: item.id,
                          type: "position",
                          side: item.side,
                          entryTime: item.entryTime,
                          endTime: item.endTime,
                          entryPrice: item.entryPrice,
                          tpPrice: item.tpPrice,
                          slPrice: item.slPrice,
                          qty: item.qty,
                          tickSize: item.tickSize,
                          tickValue: item.tickValue,
                        },
                      })
                    }
                  />

                  <rect
                    x={item.left}
                    y={item.lossTop}
                    width={item.zoneWidth}
                    height={item.lossBottom - item.lossTop}
                    fill="rgba(239, 68, 68, 0.22)"
                    stroke={CHART_COLORS.red}
                    style={{ pointerEvents: "all", cursor: "grab" }}
                    onMouseDown={(event) =>
                      startDrag(event, {
                        kind: "position-move",
                        id: item.id,
                        start:
                          getPointFromClient(event.clientX, event.clientY) || {
                            time: item.entryTime,
                            price: item.entryPrice,
                          },
                        original: {
                          id: item.id,
                          type: "position",
                          side: item.side,
                          entryTime: item.entryTime,
                          endTime: item.endTime,
                          entryPrice: item.entryPrice,
                          tpPrice: item.tpPrice,
                          slPrice: item.slPrice,
                          qty: item.qty,
                          tickSize: item.tickSize,
                          tickValue: item.tickValue,
                        },
                      })
                    }
                  />

                  <line
                    x1={item.left}
                    y1={item.entryY}
                    x2={item.right}
                    y2={item.entryY}
                    stroke="#111827"
                    strokeWidth={1.5}
                  />

                  <rect
                    x={handleX}
                    y={item.tpY - handleSize / 2}
                    width={handleSize}
                    height={handleSize}
                    rx={2}
                    fill="#fff"
                    stroke={CHART_COLORS.green}
                    strokeWidth={2}
                    style={{ pointerEvents: "all", cursor: "ns-resize" }}
                    onMouseDown={(event) =>
                      startDrag(event, {
                        kind: "position-tp",
                        id: item.id,
                      })
                    }
                  />

                  <rect
                    x={handleX}
                    y={item.slY - handleSize / 2}
                    width={handleSize}
                    height={handleSize}
                    rx={2}
                    fill="#fff"
                    stroke={CHART_COLORS.red}
                    strokeWidth={2}
                    style={{ pointerEvents: "all", cursor: "ns-resize" }}
                    onMouseDown={(event) =>
                      startDrag(event, {
                        kind: "position-sl",
                        id: item.id,
                      })
                    }
                  />

                  <rect
                    x={endHandleX}
                    y={item.entryY - handleSize / 2}
                    width={handleSize}
                    height={handleSize}
                    rx={2}
                    fill="#fff"
                    stroke="#2563eb"
                    strokeWidth={2}
                    style={{ pointerEvents: "all", cursor: "ew-resize" }}
                    onMouseDown={(event) =>
                      startDrag(event, {
                        kind: "position-end",
                        id: item.id,
                      })
                    }
                  />

                  {/* Target label */}
                  <g style={{ pointerEvents: "none" }}>
                    <rect
                      x={targetLabelX}
                      y={targetLabelY}
                      width={targetLabelWidth}
                      height={24}
                      rx={4}
                      fill={targetLabelColor}
                    />
                    <text
                      x={targetLabelX + 8}
                      y={targetTextY}
                      fontSize={12}
                      fill="#ffffff"
                      fontWeight={700}
                    >
                      {targetText}
                    </text>
                  </g>

                  {/* Entry label */}
                  <g style={{ pointerEvents: "none" }}>
                    <rect
                      x={entryLabelX}
                      y={item.entryY - 34}
                      width={entryLabelWidth}
                      height={42}
                      rx={4}
                      fill={entryLabelColor}
                    />
                    <text
  x={entryLabelX + 10}
  y={item.entryY - 18}
  fontSize={12}
  fill="#ffffff"
  fontWeight={700}
>
  {`Open P&L: ${openPnlText}, Qty: ${item.qty}`}
</text>
<text
  x={entryLabelX + 10}
  y={item.entryY - 4}
  fontSize={12}
  fill="#ffffff"
  fontWeight={700}
>
  {`Risk/reward ratio: ${formatNumber(stats.riskReward, 2)}`}
</text>
                  </g>

                  {/* Stop label */}
                  <g style={{ pointerEvents: "none" }}>
                    <rect
                      x={stopLabelX}
                      y={stopLabelY}
                      width={stopLabelWidth}
                      height={24}
                      rx={4}
                      fill={stopLabelColor}
                    />
                    <text
                      x={stopLabelX + 8}
                      y={stopTextY}
                      fontSize={12}
                      fill="#ffffff"
                      fontWeight={700}
                    >
                      {stopText}
                    </text>
                  </g>
                </g>
              );
            }

            return null;
          })}
        </svg>

        {noteColorPicker && (
          <div
            style={{
              position: "fixed",
              left: noteColorPicker.x + 8,
              top: noteColorPicker.y + 8,
              zIndex: 9999,
              display: "flex",
              gap: 6,
              padding: 8,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
            onMouseLeave={() => setNoteColorPicker(null)}
          >
            {NOTE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onMouseEnter={() => applyNoteColor(noteColorPicker.id, color)}
                onClick={() => {
                  applyNoteColor(noteColorPicker.id, color);
                  setNoteColorPicker(null);
                  setSelectedTool("cursor");
                }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "1px solid #d1d5db",
                  background: color,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        )}

        {editingNote && (
          <input
            value={editingNote.value}
            autoFocus
            onChange={(event) =>
              setEditingNote((prev) =>
                prev ? { ...prev, value: event.target.value } : prev
              )
            }
            onBlur={commitEditingNote}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitEditingNote();
              }

              if (event.key === "Escape") {
                setEditingNote(null);
                setSelectedTool("cursor");
              }
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            style={{
              position: "absolute",
              left: editingNote.x,
              top: editingNote.y,
              width: editingNote.width,
              zIndex: 9998,
              padding: "3px 6px",
              border: "1px solid #2563eb",
              borderRadius: 4,
              background: "#fff",
              color: "#111827",
              fontSize: 13,
              fontWeight: 700,
              outline: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}