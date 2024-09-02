import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import "@/index.css";

interface Activity {
  name: string;
  duration: number;
  startTime: Date;
  formattedStartTime?: string;
}

interface DayData {
  date: string;
  activities: Activity[];
}

const COLORS: string[] = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
];

const formatDuration = (minutes: number): string => {
  if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
  return `${Math.round(minutes)} min`;
};

const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
};

const getBadgeColor = (
  activityName: string,
  possibleActivities: string[]
): string => {
  const index = possibleActivities.indexOf(activityName);
  return COLORS[index % COLORS.length];
};

const App: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [possibleActivities, setPossibleActivities] = useState<string[]>([]);
  const [currentActivity, setCurrentActivity] = useState<string>("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(false);
  const [days, setDays] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");

  useEffect(() => {
    const storedDays = localStorage.getItem("timeTrackerDays");
    const storedPossibleActivities = localStorage.getItem("possibleActivities");
    const storedCurrentActivity = localStorage.getItem("currentActivity");
    const storedStartTime = localStorage.getItem("startTime");

    if (storedDays) {
      const parsedDays = JSON.parse(storedDays).map((day: DayData) => ({
        ...day,
        activities: day.activities.map((activity: any) => ({
          ...activity,
          startTime: new Date(activity.startTime),
          formattedStartTime: formatTime(new Date(activity.startTime)),
        })),
      }));
      setDays(parsedDays);
      setSelectedDay(parsedDays[parsedDays.length - 1].date);
      setActivities(parsedDays[parsedDays.length - 1].activities);
    } else {
      const today = new Date().toISOString().split("T")[0];
      setDays([{ date: today, activities: [] }]);
      setSelectedDay(today);
    }

    if (storedPossibleActivities)
      setPossibleActivities(JSON.parse(storedPossibleActivities));
    if (storedCurrentActivity) setCurrentActivity(storedCurrentActivity);
    if (storedStartTime) setStartTime(new Date(storedStartTime));
  }, []);

  useEffect(() => {
    if (days.length > 0)
      localStorage.setItem("timeTrackerDays", JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    const storedActivities = localStorage.getItem("timeTrackerActivities");
    const storedPossibleActivities = localStorage.getItem("possibleActivities");
    const storedCurrentActivity = localStorage.getItem("currentActivity");
    const storedStartTime = localStorage.getItem("startTime");

    if (storedActivities) {
      const parsedActivities = JSON.parse(storedActivities).map(
        (activity: any) => ({
          ...activity,
          startTime: new Date(activity.startTime),
          formattedStartTime: formatTime(new Date(activity.startTime)),
        })
      );
      setActivities(parsedActivities);
    }
    if (storedPossibleActivities)
      setPossibleActivities(JSON.parse(storedPossibleActivities));
    if (storedCurrentActivity) setCurrentActivity(storedCurrentActivity);
    if (storedStartTime) setStartTime(new Date(storedStartTime));
    else setStartTime(new Date());
  }, []);

  useEffect(() => {
    if (activities.length > 0)
      localStorage.setItem("timeTrackerActivities", JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    if (possibleActivities.length > 0)
      localStorage.setItem(
        "possibleActivities",
        JSON.stringify(possibleActivities)
      );
  }, [possibleActivities]);

  useEffect(() => {
    localStorage.setItem("currentActivity", currentActivity);
  }, [currentActivity]);

  useEffect(() => {
    if (startTime) localStorage.setItem("startTime", startTime.toISOString());
  }, [startTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (startTime && currentActivity) {
        const now = new Date();
        const duration = (now.getTime() - startTime.getTime()) / 1000 / 60;
        setActivities((prev) => {
          const updatedActivities = [
            ...prev.filter(
              (a) =>
                a.name !== currentActivity ||
                a.startTime.getTime() !== startTime.getTime()
            ),
            {
              name: currentActivity,
              duration,
              startTime: startTime,
              formattedStartTime: formatTime(startTime),
            },
          ];
          updateDayActivities(selectedDay, updatedActivities);
          return updatedActivities;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, currentActivity, selectedDay]);

  const updateDayActivities = (date: string, updatedActivities: Activity[]) => {
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.date === date ? { ...day, activities: updatedActivities } : day
      )
    );
  };

  const handleActivitySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputValue && !possibleActivities.includes(inputValue)) {
      setPossibleActivities((prev) => [...prev, inputValue]);
      setInputValue("");
      setShowForm(false);
    }
  };

  const handleActivityClick = (activity: string) => {
    const now = new Date();
    if (startTime && currentActivity) {
      const duration = (now.getTime() - startTime.getTime()) / 1000 / 60;
      setActivities((prev) => {
        const updatedActivities = [...prev];
        const existingActivityIndex = updatedActivities.findIndex(
          (a) =>
            a.name === currentActivity &&
            a.startTime.getTime() === startTime.getTime()
        );

        if (existingActivityIndex !== -1) {
          updatedActivities[existingActivityIndex].duration += duration;
        } else {
          updatedActivities.push({
            name: currentActivity,
            duration,
            startTime: startTime,
            formattedStartTime: formatTime(startTime),
          });
        }

        updateDayActivities(selectedDay, updatedActivities);
        return updatedActivities;
      });
    }
    setCurrentActivity(activity);
    setStartTime(now);
  };

  const handleDaySelect = (date: string) => {
    setSelectedDay(date);
    const selectedDayData = days.find((day) => day.date === date);
    if (selectedDayData) {
      setActivities(selectedDayData.activities);
      setCurrentActivity("");
      setStartTime(null);
    }
  };

  const handleEndDay = () => {
    if (currentActivity) {
      handleActivityClick(""); // This will end the current activity
    }
    const newDay = new Date();
    const newDayString = newDay.toISOString().split("T")[0];
    if (!days.some((day) => day.date === newDayString)) {
      setDays((prevDays) => [
        ...prevDays,
        { date: newDayString, activities: [] },
      ]);
    }
    setSelectedDay(newDayString);
    setActivities([]);
    setCurrentActivity("");
    setStartTime(null);
  };

  const totalMinutes = activities.reduce(
    (sum, activity) => sum + activity.duration,
    0
  );

  const chartData = activities.reduce((acc, activity) => {
    const existingActivity = acc.find((a) => a.name === activity.name);
    if (existingActivity) {
      existingActivity.duration += activity.duration;
    } else {
      acc.push({
        ...activity,
        percentage: (activity.duration / totalMinutes) * 100,
      });
    }
    return acc;
  }, [] as (Activity & { percentage: number })[]);

  const handleDownload = () => {
    const data = JSON.stringify(activities, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activities_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderTimeline = () => {
    if (activities.length === 0) return null;

    const sortedActivities = [...activities].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
    const startHour = Math.floor(sortedActivities[0].startTime.getHours());
    const endHour = Math.ceil(
      sortedActivities[sortedActivities.length - 1].startTime.getHours() +
        sortedActivities[sortedActivities.length - 1].duration / 60
    );

    const uniqueActivities = sortedActivities.reduce(
      (acc: Activity[], current) => {
        const key = `${current.name}-${current.startTime.getTime()}`;
        if (
          !acc.some(
            (item) => `${item.name}-${item.startTime.getTime()}` === key
          )
        ) {
          acc.push(current);
        }
        return acc;
      },
      []
    );

    // Define the function to format the hour
    const formatHour = (hour: number) => {
      const period = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
      return `${formattedHour} ${period}`;
    };

    return (
      <div className="relative h-96 overflow-y-auto pr-4">
        <div className="absolute top-0 bottom-0 left-16 w-px bg-gray-300"></div>
        {Array.from(
          { length: endHour - startHour + 1 },
          (_, i) => startHour + i
        ).map((hour) => (
          <div key={hour} className="flex items-start mb-4">
            <span className="w-16 text-right pr-4 text-sm text-gray-500">
              {formatHour(hour)}
            </span>
            <div className="flex-grow pl-4">
              {uniqueActivities
                .filter((activity) => {
                  const activityHour = activity.startTime.getHours();
                  const activityEndHour = activityHour + activity.duration / 60;
                  return activityHour <= hour && activityEndHour > hour;
                })
                .map((activity, index) => (
                  <div
                    key={`${
                      activity.name
                    }-${activity.startTime.getTime()}-${index}`}
                    className="mb-2 p-2 rounded"
                    style={{
                      backgroundColor: getBadgeColor(
                        activity.name,
                        possibleActivities
                      ),
                      opacity: 0.8,
                    }}
                  >
                    <span className="font-semibold text-white">
                      {activity.name}
                    </span>
                    <span className="ml-2 text-sm text-white">
                      ({formatTime(activity.startTime)} -{" "}
                      {formatDuration(activity.duration)})
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="p-8 max-w-4xl mx-auto bg-gray-100 min-h-screen">
      <Card className="mb-8">
        <CardHeader className="text-xl font-semibold">
          <div className="flex justify-between items-center">
            <span>Activities</span>
            <Select value={selectedDay} onValueChange={handleDaySelect}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a day" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day.date} value={day.date}>
                    {day.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {possibleActivities.map((activity, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer"
                style={{
                  borderColor: getBadgeColor(activity, possibleActivities),
                  color: getBadgeColor(activity, possibleActivities),
                }}
                onClick={() => handleActivityClick(activity)}
              >
                {activity}
              </Badge>
            ))}
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setShowForm(!showForm)}
            >
              +
            </Button>
          </div>
          {showForm && (
            <form
              onSubmit={handleActivitySubmit}
              className="flex space-x-4 mt-4"
            >
              <Input
                type="text"
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.stopPropagation();
                  setInputValue(e.target.value);
                }}
                placeholder="Enter new activity"
                className="flex-grow"
              />
              <Button type="submit">Add Activity</Button>
            </form>
          )}
          <div className="mt-4">
            <Button onClick={handleEndDay}>End Day / Start New Day</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="text-lg font-semibold">
            Activity Chart
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="duration"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  animationDuration={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBadgeColor(entry.name, possibleActivities)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatDuration(value),
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader className="text-lg font-semibold">
            Activity Summary
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {activities
                .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
                .map((activity, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <Badge
                      variant="outline"
                      className={
                        activity.name === currentActivity ? "animate-pulse" : ""
                      }
                      style={{
                        borderColor: getBadgeColor(
                          activity.name,
                          possibleActivities
                        ),
                        color: getBadgeColor(activity.name, possibleActivities),
                      }}
                    >
                      {activity.name}
                    </Badge>
                    <span className="text-gray-600">
                      {formatDuration(activity.duration)} (
                      {formatPercentage(
                        (activity.duration / totalMinutes) * 100
                      )}
                      ) - {activity.formattedStartTime}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card> */}
        <Card>
          <CardHeader className="text-lg font-semibold">
            Activities Timeline
          </CardHeader>
          <CardContent>{renderTimeline()}</CardContent>
        </Card>
      </div>
      <div className="mt-8 text-center">
        <Button onClick={handleDownload}>Download Activities</Button>
      </div>
    </div>
  );
};

export default App;
