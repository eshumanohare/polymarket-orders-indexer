// Event Handlers for Polymarket CTF Exchange
// This file handles OrderFilled events and processes them into our indexed data

import { OrderFilled } from "../generated/CTFExchange/CTFExchange";
import { Order, Market, DailyStats } from "../generated/schema";
import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts";

// Helper function to determine order side
function getOrderSide(makerAssetId: BigInt, takerAssetId: BigInt): string {
  // If maker asset ID is 0, it's USDC (BUY order)
  // If taker asset ID is 0, it's USDC (SELL order)
  return makerAssetId.equals(BigInt.fromI32(0)) ? "BUY" : "SELL";
}

// Helper function to calculate price in cents
function calculatePrice(
  makerAmount: BigInt,
  takerAmount: BigInt,
  side: string
): BigDecimal {
  const makerAmountDecimal = makerAmount.toBigDecimal();
  const takerAmountDecimal = takerAmount.toBigDecimal();
  
  if (takerAmountDecimal.equals(BigDecimal.fromString("0"))) {
    return BigDecimal.fromString("0");
  }
  
  if (side === "BUY") {
    // For BUY: price = (maker_amount / taker_amount) * 100
    return makerAmountDecimal.div(takerAmountDecimal).times(BigDecimal.fromString("100"));
  } else {
    // For SELL: price = (taker_amount / maker_amount) * 100
    return takerAmountDecimal.div(makerAmountDecimal).times(BigDecimal.fromString("100"));
  }
}

// Helper function to calculate volume in USD
function calculateVolumeUsd(
  makerAmount: BigInt,
  takerAmount: BigInt,
  side: string
): BigDecimal {
  // For BUY orders: volume = maker_amount (USDC paid)
  // For SELL orders: volume = taker_amount (USDC received)
  const usdcAmount = side === "BUY" ? makerAmount : takerAmount;
  return usdcAmount.toBigDecimal().div(BigDecimal.fromString("1000000")); // Convert from 6 decimals
}

// Helper function to get or create market
function getOrCreateMarket(tokenId: BigInt): Market {
  let market = Market.load(tokenId.toString());
  
  if (!market) {
    market = new Market(tokenId.toString());
    market.tokenId = tokenId;
    market.question = `Market ${tokenId.toString()}`; // Default question
    market.description = "";
    market.endDate = BigInt.fromI32(0);
    market.resolutionDate = BigInt.fromI32(0);
    market.status = "ACTIVE";
    market.totalVolume = BigDecimal.fromString("0");
    market.totalOrders = BigInt.fromI32(0);
    market.lastOrderAt = BigInt.fromI32(0);
    market.createdAt = BigInt.fromI32(0);
    market.updatedAt = BigInt.fromI32(0);
  }
  
  return market;
}

// Helper function to update daily stats
function updateDailyStats(volumeUsd: BigDecimal, timestamp: BigInt): void {
  const dayId = timestamp.toI32() / 86400; // Days since epoch
  const dayIdString = dayId.toString();
  
  let dailyStats = DailyStats.load(dayIdString);
  
  if (!dailyStats) {
    dailyStats = new DailyStats(dayIdString);
    dailyStats.date = new Date(timestamp.toI32() * 1000).toISOString().split('T')[0];
    dailyStats.totalVolume = BigDecimal.fromString("0");
    dailyStats.totalOrders = BigInt.fromI32(0);
    dailyStats.uniqueTraders = BigInt.fromI32(0);
    dailyStats.avgOrderSize = BigDecimal.fromString("0");
    dailyStats.createdAt = timestamp;
  }
  
  dailyStats.totalVolume = dailyStats.totalVolume.plus(volumeUsd);
  dailyStats.totalOrders = dailyStats.totalOrders.plus(BigInt.fromI32(1));
  dailyStats.avgOrderSize = dailyStats.totalVolume.div(dailyStats.totalOrders.toBigDecimal());
  dailyStats.save();
}

// Main event handler for OrderFilled events
export function handleOrderFilled(event: OrderFilled): void {
  // Create order ID from orderHash
  const orderId = event.params.orderHash.toHexString();
  
  // Check if order already exists (prevent duplicates)
  let order = Order.load(orderId);
  if (order) {
    return; // Order already processed
  }
  
  // Create new order
  order = new Order(orderId);
  order.orderHash = event.params.orderHash;
  order.maker = event.params.maker;
  order.taker = event.params.taker;
  order.makerAssetId = event.params.makerAssetId;
  order.takerAssetId = event.params.takerAssetId;
  order.makerAmountFilled = event.params.makerAmountFilled;
  order.takerAmountFilled = event.params.takerAmountFilled;
  order.fee = event.params.fee;
  order.blockNumber = event.block.number;
  order.transactionHash = event.transaction.hash;
  order.timestamp = event.block.timestamp;
  
  // Calculate derived fields
  order.side = getOrderSide(event.params.makerAssetId, event.params.takerAssetId);
  order.price = calculatePrice(
    event.params.makerAmountFilled,
    event.params.takerAmountFilled,
    order.side
  );
  order.volumeUsd = calculateVolumeUsd(
    event.params.makerAmountFilled,
    event.params.takerAmountFilled,
    order.side
  );
  
  // Set metadata
  order.createdAt = event.block.timestamp;
  order.updatedAt = event.block.timestamp;
  
  // Get market question (you can enhance this with actual market data)
  const tokenId = order.side === "BUY" ? event.params.takerAssetId : event.params.makerAssetId;
  if (!tokenId.equals(BigInt.fromI32(0))) {
    const market = getOrCreateMarket(tokenId);
    order.marketQuestion = market.question;
    
    // Update market stats
    market.totalVolume = market.totalVolume.plus(order.volumeUsd);
    market.totalOrders = market.totalOrders.plus(BigInt.fromI32(1));
    market.lastOrderAt = event.block.timestamp;
    market.updatedAt = event.block.timestamp;
    market.save();
  }
  
  // Save the order
  order.save();
  
  // Update daily stats
  updateDailyStats(order.volumeUsd, event.block.timestamp);
  
  // Log the order (for debugging)
  log.info("Processed OrderFilled: {} - {} {} at {}¢ for ${}", [
    orderId,
    order.side,
    order.makerAmountFilled.toString(),
    order.price.toString(),
    order.volumeUsd.toString()
  ]);
}
