import { ChevronsUpDown, Home } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
import NotificationMenu from "@/components/notification-menu"
import UserMenu from "@/components/user-menu"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { SidebarTrigger } from "./ui/sidebar"
import { Separator } from "./ui/separator"


// const validPaths = [
//   "/location/[]/"
//   "/l/idofloc/"
// ]


export default function ClientNavbar() {
  return (
    <header className="border-b px-4 ">
      <div className="flex h-16 items-center justify-between gap-4">
       
        {/* Left side */}
        <div className="flex items-center gap-5">
          <SidebarTrigger/>
          <Separator orientation="vertical" className="!h-6" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Home className="size-6 text-foreground/50"/>
              </BreadcrumbItem>
              <BreadcrumbSeparator> / </BreadcrumbSeparator>
              <BreadcrumbItem className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger className="hover:text-foreground">
                    <BreadcrumbEllipsis />
                    <span className="sr-only">Toggle menu</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <a href="#">Personal Account</a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="#">Projects</a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbItem className="max-md:hidden">
                <BreadcrumbLink href="#">Personal Account</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="max-md:hidden">
                {" "}
                /{" "}
              </BreadcrumbSeparator>
              <BreadcrumbItem className="max-md:hidden">
                <BreadcrumbLink href="#">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator> / </BreadcrumbSeparator>
              <BreadcrumbItem>
                <Select defaultValue="1">
                  <SelectPrimitive.SelectTrigger
                    aria-label="Select project"
                    asChild
                  >
                    <Button
                      variant="ghost"
                      className="focus-visible:bg-accent text-foreground h-8 px-1.5 focus-visible:ring-0"
                    >
                      <SelectValue placeholder="Select project" />
                      <ChevronsUpDown
                        size={14}
                        className="text-muted-foreground/80"
                      />
                    </Button>
                  </SelectPrimitive.SelectTrigger>
                  <SelectContent className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
                    <SelectItem value="1">Main project</SelectItem>
                    <SelectItem value="2">Origin project</SelectItem>
                  </SelectContent>
                </Select>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>



        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notification */}
          <NotificationMenu />
          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
