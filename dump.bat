@echo off
setlocal EnableDelayedExpansion
set n=0
for /f "usebackq delims=" %%L in ("C:\Users\hp\TradeForge\src\pages\TradesList.jsx") do (
  set /a n+=1
  if !n! GEQ 764 if !n! LEQ 772 echo !n!:%%L
)
