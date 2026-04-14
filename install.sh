#!/bin/bash

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}║   BUILD ON THE GO — Installer    ║${RESET}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════╝${RESET}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✘ Node.js not found. Please install Node.js 18+ from https://nodejs.org${RESET}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✘ Node.js 18+ required. Current: $(node -v)${RESET}"
  exit 1
fi
echo -e "${GREEN}✔ Node.js $(node -v) detected${RESET}"

# Check npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}✘ npm not found.${RESET}"
  exit 1
fi
echo -e "${GREEN}✔ npm $(npm -v) detected${RESET}"

# Check git
if ! command -v git &> /dev/null; then
  echo -e "${RED}✘ git not found. Please install git.${RESET}"
  exit 1
fi
echo -e "${GREEN}✔ git detected${RESET}"

echo ""
echo -e "${CYAN}Installing buildonthego...${RESET}"

# Install globally via npm from GitHub
npm install -g github:biseshbhattaraiii/buildonthego

echo ""
echo -e "${GREEN}${BOLD}✔ buildonthego installed!${RESET}"
echo ""
echo -e "${BOLD}Run setup:${RESET}"
echo -e "  ${CYAN}buildonthego init${RESET}"
echo ""
echo -e "${BOLD}Then start building:${RESET}"
echo -e "  ${CYAN}buildonthego idea${RESET}     — capture a startup idea"
echo -e "  ${CYAN}buildonthego status${RESET}   — view all startups"
echo ""
