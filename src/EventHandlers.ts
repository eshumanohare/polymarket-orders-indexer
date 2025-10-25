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
  
  // Save the order
  order.save();
}