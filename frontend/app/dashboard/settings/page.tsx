"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchTenant();
    fetchSyncStatus();
  }, []);

  const fetchTenant = async () => {
    try {
      const { data } = await api.get("/tenants/current");
      setTenant(data.data);
    } catch (error) {
      console.error("Failed to fetch tenant", error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const { data } = await api.get("/ingestion/status");
      setSyncStatus(data.data);
    } catch (error) {
      console.error("Failed to fetch sync status", error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post("/ingestion/sync", { fullSync: true });
      toast.success("Sync started successfully");
      fetchSyncStatus();
    } catch (error) {
      toast.error("Failed to start sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const { data } = await api.post(`/tenants/${tenant.id}/test-connection`);
      if (data.success) {
        toast.success("Connection successful!");
      } else {
        toast.error("Connection failed");
      }
    } catch (error) {
      toast.error("Connection test failed");
    }
  };

  if (!tenant) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Store Connection</CardTitle>
          <CardDescription>Manage your Shopify store connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="font-medium">{tenant.name}</p>
              <p className="text-sm text-muted-foreground">{tenant.shopifyDomain}</p>
            </div>
            <Badge variant={tenant.isActive ? "default" : "destructive"}>
              {tenant.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleTestConnection} variant="outline">
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Synchronization</CardTitle>
          <CardDescription>Manage data sync with Shopify</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="font-medium">Last Sync</p>
              <p className="text-sm text-muted-foreground">
                {tenant.lastSyncAt 
                  ? new Date(tenant.lastSyncAt).toLocaleString() 
                  : "Never synced"}
              </p>
            </div>
            {syncStatus?.inProgress ? (
              <Badge variant="secondary" className="animate-pulse">Syncing...</Badge>
            ) : (
              <Badge variant="outline">Idle</Badge>
            )}
          </div>

          <Button onClick={handleSync} disabled={syncing || syncStatus?.inProgress}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Starting Sync..." : "Trigger Full Sync"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


