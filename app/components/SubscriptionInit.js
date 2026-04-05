"use client";

import { useEffect } from "react";
import { useAuth } from "../../lib/auth";
import { initSubscriptions } from "../../lib/subscription";

export default function SubscriptionInit() {
  const { user } = useAuth();

  useEffect(() => {
    initSubscriptions(user?.id);
  }, [user]);

  return null;
}
