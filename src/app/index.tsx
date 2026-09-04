import React from "react";
import { StatusBar } from "expo-status-bar";

import CadastroDespesaScreen from "../screens/CadastroDespesaScreen";

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <CadastroDespesaScreen />
    </>
  );
}
