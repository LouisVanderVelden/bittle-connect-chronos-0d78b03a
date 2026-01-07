import { Usb, Unplug, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SerialConnectionTabProps {
  isConnected: boolean;
  onConnect: () => Promise<boolean>;
  onDisconnect: () => Promise<void>;
}

export function SerialConnectionTab({ isConnected, onConnect, onDisconnect }: SerialConnectionTabProps) {
  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {isConnected ? (
              <Wifi className="h-6 w-6 text-success" />
            ) : (
              <WifiOff className="h-6 w-6 text-muted-foreground" />
            )}
            Serial Connection
          </CardTitle>
          <CardDescription>
            Connect to your Bittle robot via USB serial at 115200 baud
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success glow-success' : 'bg-muted-foreground'}`} />
              <span className="font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-sm text-muted-foreground font-mono">
              115200 baud
            </span>
          </div>

          <div className="flex gap-4">
            {!isConnected ? (
              <Button 
                onClick={onConnect} 
                className="flex-1 gap-2"
                size="lg"
              >
                <Usb className="h-5 w-5" />
                Connect to Bittle
              </Button>
            ) : (
              <Button
                onClick={onDisconnect}
                variant="destructive"
                className="flex-1 gap-2"
                size="lg"
              >
                <Unplug className="h-5 w-5" />
                Disconnect
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Connect your Bittle robot via USB</li>
              <li>Click "Connect to Bittle" and select the serial port</li>
              <li>Use Chrome, Edge, or Opera for Web Serial API support</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
