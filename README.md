# Polymarket Orders Indexer

This Envio HyperIndex indexer monitors OrderFilled events from the Polymarket CTF Exchange contract on Polygon and indexes them for real-time querying.

## Features

- **Real-time Order Tracking**: Monitors OrderFilled events as they happen
- **Price Calculation**: Automatically calculates order prices in cents
- **Volume Tracking**: Tracks USD volume for each order
- **Market Statistics**: Aggregates data by market and daily stats
- **GraphQL API**: Provides a GraphQL endpoint for querying indexed data

## Contract Details

- **Contract**: CTF Exchange
- **Address**: `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`
- **Network**: Polygon (Chain ID: 137)
- **Event**: OrderFilled

## Data Schema

### Order Entity
- `id`: Order hash (unique identifier)
- `orderHash`: The order hash from the event
- `maker`: Address of the order maker
- `taker`: Address of the order taker
- `side`: "BUY" or "SELL"
- `price`: Calculated price in cents
- `volumeUsd`: Volume in USD
- `marketQuestion`: Associated market question
- `timestamp`: Block timestamp
- `blockNumber`: Block number

### Market Entity
- `id`: Token ID
- `question`: Market question
- `totalVolume`: Total volume traded
- `totalOrders`: Total number of orders
- `status`: Market status

### DailyStats Entity
- `id`: Date (YYYY-MM-DD)
- `totalVolume`: Daily volume
- `totalOrders`: Daily order count
- `uniqueTraders`: Unique traders count

## Deployment

This indexer is configured for deployment on Envio's hosted service:

1. **Repository**: Connect this repository to Envio
2. **Config File**: `config.yaml`
3. **Root Directory**: `.` (current directory)
4. **Deployment Branch**: `main`

## Environment Variables

- `ENVIO_API_TOKEN`: Your Envio API token (configured in Envio dashboard)

## Querying Data

Once deployed, you can query the indexed data using GraphQL:

```graphql
# Get recent orders
query GetRecentOrders {
  orders(
    first: 10
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    orderHash
    maker
    taker
    side
    price
    volumeUsd
    marketQuestion
    timestamp
  }
}

# Get market statistics
query GetMarketStats($tokenId: String!) {
  market(id: $tokenId) {
    id
    question
    totalVolume
    totalOrders
    status
  }
}

# Get daily statistics
query GetDailyStats($date: String!) {
  dailyStats(id: $date) {
    id
    totalVolume
    totalOrders
    uniqueTraders
    avgOrderSize
  }
}
```

## Development

### Local Development
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Start
```bash
npm start
```

## Monitoring

Monitor your indexer through the Envio dashboard:
- View indexing progress
- Check for errors
- Monitor performance metrics
- Set up alerts

## API Integration

The indexed data can be accessed via:
- **GraphQL Endpoint**: Provided by Envio
- **REST API**: Available through Envio's API
- **WebSocket**: Real-time updates (if configured)

## Support

For issues and questions:
- Check the [Envio Documentation](https://docs.envio.dev)
- Review the [HyperIndex Guide](https://docs.envio.dev/docs/HyperIndex/hosted-service-deployment)
- Contact Envio support
