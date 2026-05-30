// src/screens/ShopListScreen.tsx
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { TransformComponent, type ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { PinchSafeTransformWrapper } from "../components/PinchSafeTransformWrapper";