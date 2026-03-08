#!/bin/bash

# grep-Commander 启动脚本
# 支持启动多个实例在不同端口

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认端口
DEFAULT_PORT=3000

# 帮助信息
show_help() {
  echo -e "${BLUE}grep-Commander 启动脚本${NC}"
  echo ""
  echo "用法:"
  echo "  ./start.sh [端口]     启动服务（默认端口 3000）"
  echo "  ./start.sh stop       停止所有服务"
  echo "  ./start.sh list       列出运行中的服务"
  echo "  ./start.sh -h, --help 显示帮助"
  echo ""
  echo "示例:"
  echo "  ./start.sh           # 启动在 3000 端口"
  echo "  ./start.sh 3001      # 启动在 3001 端口"
  echo "  ./start.sh 8080      # 启动在 8080 端口"
  echo "  ./start.sh stop      # 停止所有服务"
}

# 停止所有服务
stop_all() {
  echo -e "${YELLOW}正在停止所有 grep-Commander 服务...${NC}"
  pkill -f "node app.js" 2>/dev/null
  sleep 1
  echo -e "${GREEN}已停止所有服务${NC}"
}

# 列出运行中的服务
list_services() {
  echo -e "${BLUE}运行中的 grep-Commander 服务:${NC}"
  ps aux | grep "node app.js" | grep -v grep | while read line; do
    port=$(echo "$line" | grep -oE "PORT=[0-9]+|argv\[2\]=[0-9]+|:[0-9]+" | head -1)
    if [ -z "$port" ]; then
      port=":3000"
    fi
    echo -e "  ${GREEN}$port${NC} - PID: $(echo $line | awk '{print $2}')"
  done
  
  if ! ps aux | grep -q "[n]ode app.js"; then
    echo -e "  ${YELLOW}没有运行中的服务${NC}"
  fi
}

# 启动服务
start_server() {
  local port=$1
  
  # 检查端口是否被占用
  if lsof -i :$port > /dev/null 2>&1; then
    echo -e "${RED}端口 $port 已被占用${NC}"
    read -p "是否尝试使用其他端口? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      local new_port=$((port + 1))
      start_server $new_port
    else
      exit 1
    fi
  fi
  
  echo -e "${GREEN}启动 grep-Commander 在端口 $port...${NC}"
  
  # 启动服务
  PORT=$port node app.js &
  sleep 2
  
  # 检查是否成功启动
  if curl -s http://localhost:$port/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 服务启动成功!${NC}"
    echo -e "访问地址: ${BLUE}http://localhost:$port${NC}"
  else
    echo -e "${RED}✗ 服务启动失败${NC}"
    exit 1
  fi
}

# 主逻辑
case "${1:-}" in
  -h|--help)
    show_help
    ;;
  stop)
    stop_all
    ;;
  list)
    list_services
    ;;
  *)
    port=${1:-$DEFAULT_PORT}
    if ! [[ "$port" =~ ^[0-9]+$ ]]; then
      echo -e "${RED}无效的端口号: $port${NC}"
      show_help
      exit 1
    fi
    start_server $port
    ;;
esac