package main
import (
	"fmt"
	"net"
)
func main() {
	ips, err := net.LookupIP("127.0.0.1")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("IPs:", ips)
}
