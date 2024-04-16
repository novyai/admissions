interface AppointmentSchedulerProps {
  times: Date[]
}

export function AppointmentScheduler({ times }: AppointmentSchedulerProps) {
  return (
    <div className="p-2 border-2  rounded">
      <p className="font-bold">Temporary Appointments Scheduler Container</p>
      <ul>
        {times.map(time => (
          <li key={JSON.stringify(time)}>{time.toLocaleDateString()}</li>
        ))}
      </ul>
    </div>
  )
}
