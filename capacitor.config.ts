import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wholefed.app",
  appName: "Wholefed",
  webDir: "out",
  server: {
    url: "https://wholefed.vercel.app",
  },
  ios: {
    scheme: "Wholefed",
  },
  plugins: {
    Camera: {
      // iOS camera permissions
    },
  },
};

export default config;
