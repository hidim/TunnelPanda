import asyncio
import websockets
import base64
import json
import logging
import ssl

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

uri = "wss://blue.tunnelpanda.com/db/status"
username = "pandasal"
password = "TAtenIAneaRg"
token = "1z4Cg7Qic9C3AGUK1c6eYY3uqHXGsSSuAidujGOTZH5UPp49a6G5cKx86utBLQkZ"

headers = {
    "Authorization": "Basic " + base64.b64encode(f"{username}:{password}".encode()).decode(),
    "X-APP-TOKEN": token
}

async def test_ws():
    # Create SSL context that doesn't verify certificates
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        logger.info(f"Connecting to {uri}")
        logger.info(f"Headers: {headers}")
        
        # Try with more explicit WebSocket headers
        ws_headers = {
            "Authorization": headers["Authorization"],
            "X-APP-TOKEN": headers["X-APP-TOKEN"],
            "Upgrade": "websocket",
            "Connection": "Upgrade",
            "Sec-WebSocket-Version": "13"
        }
        
        async with websockets.connect(
            uri, 
            additional_headers=ws_headers,
            ssl=ssl_context,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=10
        ) as websocket:
            logger.info("Connected successfully")
            
            # Try sending a ping message
            test_message = json.dumps({"type": "ping", "data": "test"})
            await websocket.send(test_message)
            logger.info(f"Sent: {test_message}")
            
            # Wait for response with timeout
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"Received: {response}")
            except asyncio.TimeoutError:
                logger.warning("No response received within 5 seconds")
                
            # Keep connection alive for a bit to see if server sends anything
            logger.info("Listening for additional messages...")
            try:
                while True:
                    message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    logger.info(f"Additional message: {message}")
            except asyncio.TimeoutError:
                logger.info("No additional messages received")
                
    except websockets.exceptions.ConnectionClosed as e:
        logger.error(f"Connection closed: {e}")
    except websockets.exceptions.InvalidHandshake as e:
        logger.error(f"Invalid handshake: {e}")
    except websockets.exceptions.InvalidURI as e:
        logger.error(f"Invalid URI: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws())
